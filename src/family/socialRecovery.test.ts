import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initSodium, sodium } from '../crypto/sodium'
import { generateEncryptionKeypair, generateSigningKeypair, generateScopeKey } from '../crypto/keys'
import { saveFamily, clearFamily } from './familyStore'
import type { FamilyState, FamilyMember, StoredKeypair } from './familyStore'
import {
  familyThreshold, generateFamilyShares, verifySharesReconstructKey, shareEligibleMembers,
} from './socialRecovery'

const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { Reflect.deleteProperty(store, k) },
  clear: () => { Object.keys(store).forEach(k => Reflect.deleteProperty(store, k)) },
  key: (i: number) => Object.keys(store)[i] ?? null,
  length: 0,
}
function wipe() { Object.keys(store).forEach(k => Reflect.deleteProperty(store, k)) }

const kp = (): StoredKeypair => {
  const e = generateEncryptionKeypair()
  return { publicKey: sodium.to_base64(e.publicKey), secretKey: sodium.to_base64(e.secretKey) }
}

/** Build a family with `n` full members plus optional dependents (no device key). */
function makeFamily(n: number, dependents = 0): FamilyState {
  const members: FamilyMember[] = []
  for (let i = 0; i < n; i++) {
    members.push({
      memberId: `m${i}`, name: `Member ${i}`, role: i === 0 ? 'admin' : 'member',
      deviceId: `dev-${i}`, encPublicKey: kp().publicKey,
      sigPublicKey: sodium.to_base64(generateSigningKeypair().publicKey), isDependent: false,
    })
  }
  for (let d = 0; d < dependents; d++) {
    members.push({
      memberId: `d${d}`, name: `Dependent ${d}`, role: 'member',
      deviceId: '', encPublicKey: '', sigPublicKey: '', isDependent: true,
    })
  }
  const fk = generateScopeKey('family', 0)
  return {
    familyId: 'fam', familyName: 'Fam', familyType: 'joint', createdAt: '2026-01-01',
    deviceId: 'dev-0', deviceLabel: 'A', deviceEncKeypair: kp(), deviceSigKeypair: kp(),
    familyKey: { keyId: fk.keyId, scope: 'family', epoch: 0, bytes: sodium.to_base64(fk.bytes) },
    recoveryPackage: null, myMemberId: 'm0', role: 'admin',
    backupAdminMemberId: null, members, emergencyCardEnabled: {}, relayDeviceToken: null,
  }
}

beforeAll(async () => { await initSodium() })
beforeEach(() => { wipe(); clearFamily() })

describe('social recovery (Shamir threshold of the family key)', () => {
  it('needs at least two full members', () => {
    saveFamily(makeFamily(1))
    expect(familyThreshold()).toBeNull()
    expect(() => generateFamilyShares()).toThrow()
  })

  it('counts only full members (dependents get no share)', () => {
    saveFamily(makeFamily(3, 2))   // 3 full + 2 dependents
    expect(shareEligibleMembers()).toHaveLength(3)
    const set = generateFamilyShares()
    expect(set.total).toBe(3)
    expect(set.shares).toHaveLength(3)
  })

  it('computes M = clamp(ceil(0.3N),2,6)', () => {
    saveFamily(makeFamily(4))
    expect(familyThreshold()).toEqual({ threshold: 2, total: 4 })   // ceil(1.2)=2
    clearFamily(); wipe()
    saveFamily(makeFamily(10))
    expect(familyThreshold()).toEqual({ threshold: 3, total: 10 })  // ceil(3.0)=3
  })

  it('any threshold-sized subset of shares rebuilds the key; fewer do not', () => {
    saveFamily(makeFamily(5))                // N=5, M=ceil(1.5)=2
    const set = generateFamilyShares()
    expect(set.threshold).toBe(2)
    const codes = set.shares.map(s => s.share)

    // Exactly M shares reconstruct.
    expect(verifySharesReconstructKey([codes[0], codes[3]])).toBe(true)
    // A different M-subset also works.
    expect(verifySharesReconstructKey([codes[1], codes[4]])).toBe(true)
    // One share alone is rejected (below threshold).
    expect(verifySharesReconstructKey([codes[2]])).toBe(false)
  })

  it('shares from a different family do not reconstruct this key', () => {
    saveFamily(makeFamily(4))
    const foreign = (() => { const f = makeFamily(4); saveFamily(f); return generateFamilyShares() })()
    // Re-save the original family, then try the foreign shares against it.
    saveFamily(makeFamily(4))
    expect(verifySharesReconstructKey(foreign.shares.slice(0, 2).map(s => s.share))).toBe(false)
  })
})
