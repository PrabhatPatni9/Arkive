/**
 * Social (threshold) recovery for the family key — recovery layer 3 in the brief.
 *
 * The family key is split with Shamir's Secret Sharing into one share per full member, with a
 * threshold M = clamp(ceil(0.3·N), 2, 6). Any M members can combine their shares to reconstruct
 * the key if every device is lost; fewer than M shares reveal nothing. This is a *backup* — it
 * never gates everyday access (each device already holds the key directly).
 *
 * Shares are handed to members to store safely (like the recovery phrase). We deliberately do NOT
 * persist shares on the operator or in the op log — the operator must never be able to reconstruct
 * a family key.
 */
import { sodium } from '../crypto/sodium'
import { splitKey, reconstructKey, computeThreshold } from '../crypto/threshold'
import { getFamily } from './familyStore'
import type { FamilyMember } from './familyStore'

export interface FamilyShare {
  memberId: string
  memberName: string
  share: string   // base64
}

export interface ShareSet {
  threshold: number      // M — shares required to reconstruct
  total: number          // N — shares issued
  keyId: string          // family key id these shares reconstruct
  shares: FamilyShare[]
}

/** Members eligible to hold a share: real people with a device key (dependents have none). */
export function shareEligibleMembers(): FamilyMember[] {
  const family = getFamily()
  if (!family) return []
  return family.members.filter(m => !m.isDependent && m.encPublicKey)
}

/** The M-of-N split that would be used for the current family (null if too few members). */
export function familyThreshold(): { threshold: number; total: number } | null {
  const total = shareEligibleMembers().length
  if (total < 2) return null
  return { threshold: computeThreshold(total), total }
}

/**
 * Split the current family key into one share per eligible member. Returns the shares tagged with
 * the member they should go to. Throws if there are fewer than two eligible members.
 */
export function generateFamilyShares(): ShareSet {
  const family = getFamily()
  if (!family) throw new Error('No family on this device')
  const members = shareEligibleMembers()
  if (members.length < 2) throw new Error('Social recovery needs at least two full members')

  const keyBytes = sodium.from_base64(family.familyKey.bytes)
  const { shares, threshold } = splitKey(keyBytes, members.length)

  return {
    threshold,
    total: members.length,
    keyId: family.familyKey.keyId,
    shares: members.map((m, i) => ({
      memberId: m.memberId,
      memberName: m.name,
      share: sodium.to_base64(shares[i]),
    })),
  }
}

/**
 * Reconstruct a key from base64 shares. Returns the key bytes, or throws if the shares are
 * malformed / insufficient. Callers verify the result against a known key id before trusting it.
 */
export function reconstructFromShares(base64Shares: string[]): Uint8Array {
  const clean = base64Shares.map(s => s.trim()).filter(Boolean)
  if (clean.length < 2) throw new Error('Provide at least two shares')
  const bytes = clean.map(s => sodium.from_base64(s))
  return reconstructKey(bytes)
}

/**
 * Verify that a set of shares reconstructs the CURRENT family key (a safe way to test a backup
 * without exposing anything). Returns true only on an exact match.
 */
export function verifySharesReconstructKey(base64Shares: string[]): boolean {
  const family = getFamily()
  if (!family) return false
  try {
    const reconstructed = reconstructFromShares(base64Shares)
    const current = sodium.from_base64(family.familyKey.bytes)
    return reconstructed.length === current.length && sodium.memcmp(reconstructed, current)
  } catch {
    return false
  }
}
