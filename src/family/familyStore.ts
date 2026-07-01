import { sodium } from '../crypto/sodium'
import {
  generateScopeKey,
  generateEncryptionKeypair,
  generateSigningKeypair,
  wrapKeyTo,
  unwrapKey,
} from '../crypto/keys'
import type { EncryptionKeypair, SigningKeypair, ScopeKey } from '../crypto/keys'
import { createRecoveryPackage, moderateParams, sealWithPassphrase } from '../crypto/recovery'
import { deriveVerificationCode } from '../crypto/handshake'
import { generateRecoveryPhrase } from './wordlist'
import { secureSave, secureLoad, secureRemove } from './secureStore'

const STORAGE_KEY = 'arkive_family_v1'
const PENDING_JOIN_KEY = 'arkive_pending_join_v1'

export interface StoredKeypair {
  publicKey: string   // base64
  secretKey: string   // base64
}

export interface StoredScopeKey {
  keyId: string
  scope: 'family' | 'node' | 'member'
  epoch: number
  bytes: string       // base64
}

export interface FamilyMember {
  memberId: string
  name: string
  role: 'admin' | 'member' | 'view_only'
  deviceId: string
  encPublicKey: string
  sigPublicKey: string
  isDependent: boolean
  isFinancialAdmin?: boolean
  // Emergency / health fields (stored locally, encrypted in ops on sync)
  bloodGroup?: string
  allergies?: string
  conditions?: string
  medications?: string
  emergencyContacts?: string
  policyNumbers?: string
  dateOfBirth?: string
}

export interface FamilyState {
  familyId: string
  familyName: string
  familyType: 'nuclear' | 'joint'
  createdAt: string
  deviceId: string
  deviceLabel: string
  deviceEncKeypair: StoredKeypair
  deviceSigKeypair: StoredKeypair
  familyKey: StoredScopeKey
  recoveryPackage: { salt: string; wrappedKey: string } | null
  myMemberId: string
  role: 'admin' | 'member'
  backupAdminMemberId: string | null
  members: FamilyMember[]
  emergencyCardEnabled: Record<string, boolean>
  relayDeviceToken: string | null
}

// Shared between requester and admin during the join handshake
export interface JoinRequest {
  requestId: string
  deviceId: string
  deviceEncPublicKey: string   // base64
  deviceSigPublicKey: string   // base64
  requesterName: string
  timestamp: string
}

// Sent from admin to requester after approval
export interface JoinApproval {
  requestId: string
  familyId: string
  familyName: string
  familyType: 'nuclear' | 'joint'
  wrappedFamilyKey: string     // base64 — family key sealed to requester's enc pub key
  adminEncPublicKey: string    // base64 — used by requester to derive verification code
  adminMemberId: string
  adminDeviceId: string
  newMemberId: string
  familyKeyId: string
  familyKeyEpoch: number
  timestamp: string
}

// In-progress join state persisted on the requester's device
export interface PendingJoin {
  request: JoinRequest
  deviceEncSecKey: string      // base64
  deviceSigSecKey: string      // base64
  myName: string
}

// In-memory caches. These keep getFamily()/getPendingJoin() synchronous (the whole app reads
// them during render) while the durable copy lives encrypted in secureStore. The caches are
// populated by hydrateFamilyStore() at boot, before any screen renders.
let familyCache: FamilyState | null = null
let pendingJoinCache: PendingJoin | null = null

export function getFamily(): FamilyState | null {
  return familyCache
}

export function saveFamily(state: FamilyState): void {
  familyCache = state
  void secureSave(STORAGE_KEY, JSON.stringify(state))
}

export function clearFamily(): void {
  familyCache = null
  pendingJoinCache = null
  void secureRemove(STORAGE_KEY)
  void secureRemove(PENDING_JOIN_KEY)
  wipeLegacyPlaintext(STORAGE_KEY)
  wipeLegacyPlaintext(PENDING_JOIN_KEY)
}

export function getPendingJoin(): PendingJoin | null {
  return pendingJoinCache
}

export function savePendingJoin(pj: PendingJoin): void {
  pendingJoinCache = pj
  void secureSave(PENDING_JOIN_KEY, JSON.stringify(pj))
}

export function clearPendingJoin(): void {
  pendingJoinCache = null
  void secureRemove(PENDING_JOIN_KEY)
}

/**
 * Overwrite a legacy plaintext value before removing it, so the sensitive bytes do not linger
 * in the storage backing after deletion. No-op if the key or localStorage is absent.
 */
function wipeLegacyPlaintext(key: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    const existing = localStorage.getItem(key)
    if (existing != null) {
      localStorage.setItem(key, '0'.repeat(existing.length))
    }
    localStorage.removeItem(key)
  } catch { /* ignore */ }
}

/** Move any legacy plaintext value into the secure store, then wipe the plaintext. */
async function migrateLegacyPlaintext(key: string): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null
  const legacy = localStorage.getItem(key)
  if (legacy == null) return null
  await secureSave(key, legacy)
  wipeLegacyPlaintext(key)
  return legacy
}

/**
 * Load family + pending-join state from the encrypted secure store into the in-memory caches.
 * Migrates any pre-existing plaintext localStorage copy (from before encrypted storage) on
 * first run. Call once at app boot, before rendering. Safe to call more than once.
 */
export async function hydrateFamilyStore(): Promise<void> {
  const famRaw = (await secureLoad(STORAGE_KEY)) ?? (await migrateLegacyPlaintext(STORAGE_KEY))
  familyCache = famRaw ? (JSON.parse(famRaw) as FamilyState) : null

  const pjRaw = (await secureLoad(PENDING_JOIN_KEY)) ?? (await migrateLegacyPlaintext(PENDING_JOIN_KEY))
  pendingJoinCache = pjRaw ? (JSON.parse(pjRaw) as PendingJoin) : null
}

export function makePhrase(): string {
  return generateRecoveryPhrase(sodium.randombytes_buf(12))
}

export function createFamily(params: {
  familyName: string
  familyType: 'nuclear' | 'joint'
  myName: string
  recoveryPhrase: string
}): FamilyState {
  const { familyName, familyType, myName, recoveryPhrase } = params

  const familyId = sodium.to_hex(sodium.randombytes_buf(16))
  const deviceId = sodium.to_hex(sodium.randombytes_buf(16))
  const memberId = sodium.to_hex(sodium.randombytes_buf(16))

  const encKp: EncryptionKeypair = generateEncryptionKeypair()
  const sigKp: SigningKeypair = generateSigningKeypair()
  const familyKey: ScopeKey = generateScopeKey('family', 0)

  const pkg = createRecoveryPackage(familyKey, recoveryPhrase, moderateParams())

  const state: FamilyState = {
    familyId,
    familyName,
    familyType,
    createdAt: new Date().toISOString(),
    deviceId,
    deviceLabel: `${myName}'s phone`,
    deviceEncKeypair: {
      publicKey: sodium.to_base64(encKp.publicKey),
      secretKey: sodium.to_base64(encKp.secretKey),
    },
    deviceSigKeypair: {
      publicKey: sodium.to_base64(sigKp.publicKey),
      secretKey: sodium.to_base64(sigKp.secretKey),
    },
    familyKey: {
      keyId: familyKey.keyId,
      scope: 'family',
      epoch: 0,
      bytes: sodium.to_base64(familyKey.bytes),
    },
    recoveryPackage: pkg,
    myMemberId: memberId,
    role: 'admin',
    backupAdminMemberId: null,
    members: [
      {
        memberId,
        name: myName,
        role: 'admin',
        deviceId,
        encPublicKey: sodium.to_base64(encKp.publicKey),
        sigPublicKey: sodium.to_base64(sigKp.publicKey),
        isDependent: false,
      },
    ],
    emergencyCardEnabled: {},
    relayDeviceToken: null,
  }

  saveFamily(state)
  return state
}

export function createJoinRequest(myName: string): PendingJoin {
  const encKp: EncryptionKeypair = generateEncryptionKeypair()
  const sigKp: SigningKeypair = generateSigningKeypair()
  const deviceId = sodium.to_hex(sodium.randombytes_buf(16))

  const request: JoinRequest = {
    requestId: sodium.to_hex(sodium.randombytes_buf(16)),
    deviceId,
    deviceEncPublicKey: sodium.to_base64(encKp.publicKey),
    deviceSigPublicKey: sodium.to_base64(sigKp.publicKey),
    requesterName: myName,
    timestamp: new Date().toISOString(),
  }

  const pending: PendingJoin = {
    request,
    deviceEncSecKey: sodium.to_base64(encKp.secretKey),
    deviceSigSecKey: sodium.to_base64(sigKp.secretKey),
    myName,
  }
  savePendingJoin(pending)
  return pending
}

export function approveJoinRequest(request: JoinRequest): JoinApproval {
  const family = getFamily()
  if (!family) throw new Error('No family found on this device')
  if (family.role !== 'admin') throw new Error('Only an admin can approve join requests')

  const familyKey: ScopeKey = {
    keyId: family.familyKey.keyId,
    scope: family.familyKey.scope,
    epoch: family.familyKey.epoch,
    bytes: sodium.from_base64(family.familyKey.bytes),
  }

  const requesterEncPubKey = sodium.from_base64(request.deviceEncPublicKey)
  const wrapped = wrapKeyTo(familyKey, requesterEncPubKey)
  const newMemberId = sodium.to_hex(sodium.randombytes_buf(16))

  const newMember: FamilyMember = {
    memberId: newMemberId,
    name: request.requesterName,
    role: 'member',
    deviceId: request.deviceId,
    encPublicKey: request.deviceEncPublicKey,
    sigPublicKey: request.deviceSigPublicKey,
    isDependent: false,
  }
  family.members.push(newMember)
  saveFamily(family)

  return {
    requestId: request.requestId,
    familyId: family.familyId,
    familyName: family.familyName,
    familyType: family.familyType,
    wrappedFamilyKey: sodium.to_base64(wrapped),
    adminEncPublicKey: family.deviceEncKeypair.publicKey,
    adminMemberId: family.myMemberId,
    adminDeviceId: family.deviceId,
    newMemberId,
    familyKeyId: family.familyKey.keyId,
    familyKeyEpoch: family.familyKey.epoch,
    timestamp: new Date().toISOString(),
  }
}

export function deriveHandshakeCode(
  requesterEncPubKey: string,   // base64
  adminEncPubKey: string        // base64
): string {
  return deriveVerificationCode(
    sodium.from_base64(requesterEncPubKey),
    sodium.from_base64(adminEncPubKey)
  )
}

export function completeJoin(pending: PendingJoin, approval: JoinApproval): FamilyState {
  const encKp: EncryptionKeypair = {
    publicKey: sodium.from_base64(pending.request.deviceEncPublicKey),
    secretKey: sodium.from_base64(pending.deviceEncSecKey),
  }

  const wrapped = sodium.from_base64(approval.wrappedFamilyKey)
  const familyKey = unwrapKey(
    wrapped,
    encKp,
    'family',
    approval.familyKeyEpoch,
    approval.familyKeyId
  )

  const state: FamilyState = {
    familyId: approval.familyId,
    familyName: approval.familyName,
    familyType: approval.familyType,
    createdAt: new Date().toISOString(),
    deviceId: pending.request.deviceId,
    deviceLabel: `${pending.myName}'s phone`,
    deviceEncKeypair: {
      publicKey: pending.request.deviceEncPublicKey,
      secretKey: pending.deviceEncSecKey,
    },
    deviceSigKeypair: {
      publicKey: pending.request.deviceSigPublicKey,
      secretKey: pending.deviceSigSecKey,
    },
    familyKey: {
      keyId: familyKey.keyId,
      scope: 'family',
      epoch: familyKey.epoch,
      bytes: sodium.to_base64(familyKey.bytes),
    },
    recoveryPackage: null,  // members use surviving-device recovery
    myMemberId: approval.newMemberId,
    role: 'member',
    backupAdminMemberId: approval.adminMemberId,
    members: [
      {
        memberId: approval.adminMemberId,
        name: 'Admin',
        role: 'admin',
        deviceId: approval.adminDeviceId,
        encPublicKey: approval.adminEncPublicKey,
        sigPublicKey: '',
        isDependent: false,
      },
      {
        memberId: approval.newMemberId,
        name: pending.myName,
        role: 'member',
        deviceId: pending.request.deviceId,
        encPublicKey: pending.request.deviceEncPublicKey,
        sigPublicKey: pending.request.deviceSigPublicKey,
        isDependent: false,
      },
    ],
    emergencyCardEnabled: {},
    relayDeviceToken: null,
  }

  saveFamily(state)
  clearPendingJoin()
  return state
}

export function updateMemberProfile(
  memberId: string,
  updates: Partial<Omit<FamilyMember, 'memberId' | 'role' | 'deviceId' | 'encPublicKey' | 'sigPublicKey' | 'isDependent'>>
): void {
  const family = getFamily()
  if (!family) return
  const idx = family.members.findIndex(m => m.memberId === memberId)
  if (idx === -1) return
  family.members[idx] = { ...family.members[idx], ...updates }
  saveFamily(family)
}

export function setEmergencyCardEnabled(memberId: string, enabled: boolean): void {
  const family = getFamily()
  if (!family) return
  family.emergencyCardEnabled[memberId] = enabled
  saveFamily(family)
}

export function setBackupAdmin(memberId: string): void {
  const family = getFamily()
  if (!family || family.role !== 'admin') return
  const target = family.members.find(m => m.memberId === memberId)
  if (!target || target.memberId === family.myMemberId || target.isDependent) return
  family.backupAdminMemberId = memberId
  saveFamily(family)
}

export function createDependentMember(params: {
  name: string
  dateOfBirth?: string
  bloodGroup?: string
  allergies?: string
  conditions?: string
  medications?: string
}): FamilyMember {
  const family = getFamily()
  if (!family || family.role !== 'admin') throw new Error('Only admin can add dependents')
  const memberId = sodium.to_hex(sodium.randombytes_buf(16))
  const member: FamilyMember = {
    memberId,
    name: params.name,
    role: 'member',
    deviceId: '',
    encPublicKey: '',
    sigPublicKey: '',
    isDependent: true,
    dateOfBirth: params.dateOfBirth,
    bloodGroup: params.bloodGroup,
    allergies: params.allergies,
    conditions: params.conditions,
    medications: params.medications,
  }
  family.members.push(member)
  saveFamily(family)
  return member
}

export function renameDevice(label: string): void {
  const family = getFamily()
  if (!family) return
  const trimmed = label.trim()
  if (!trimmed) return
  family.deviceLabel = trimmed
  saveFamily(family)
}

export function exportFamilyData(): string {
  const family = getFamily()
  const remindersRaw = localStorage.getItem('arkive_reminders_v1')
  const reminders = remindersRaw ? JSON.parse(remindersRaw) : []
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    appVersion: '0.0.1',
    family: family ? {
      familyId: family.familyId,
      familyName: family.familyName,
      familyType: family.familyType,
      createdAt: family.createdAt,
      members: family.members.map(m => ({
        memberId: m.memberId,
        name: m.name,
        role: m.role,
        isDependent: m.isDependent,
        bloodGroup: m.bloodGroup,
        allergies: m.allergies,
        conditions: m.conditions,
        medications: m.medications,
        emergencyContacts: m.emergencyContacts,
        policyNumbers: m.policyNumbers,
        dateOfBirth: m.dateOfBirth,
      })),
    } : null,
    reminders,
  }, null, 2)
}

/**
 * Passphrase-encrypted export. The export contains plaintext health data (blood groups,
 * allergies, medications, policy numbers), so it must never leave the device in the clear.
 * The result is an Argon2id + XChaCha20-Poly1305 sealed blob restorable only with the
 * passphrase. Choose a strong passphrase — losing it means the export is unrecoverable.
 */
export function exportFamilyDataEncrypted(passphrase: string): string {
  if (passphrase.length < 8) {
    throw new Error('Export passphrase must be at least 8 characters')
  }
  const plaintext = sodium.from_string(exportFamilyData())
  const sealed = sealWithPassphrase(plaintext, passphrase)
  return JSON.stringify({ format: 'arkive-export-encrypted', ...sealed }, null, 2)
}

export function leaveFamily(): void {
  clearFamily()
  localStorage.removeItem('arkive_reminders_v1')
}

export function setRelayDeviceToken(token: string): void {
  const family = getFamily()
  if (!family) return
  family.relayDeviceToken = token
  saveFamily(family)
}

export function purgeAllData(): void {
  // Clear the encrypted secure store (family + pending join) and every legacy arkive_* key.
  familyCache = null
  pendingJoinCache = null
  void secureRemove(STORAGE_KEY)
  void secureRemove(PENDING_JOIN_KEY)
  const keys = Object.keys(localStorage).filter(k => k.startsWith('arkive_'))
  keys.forEach(k => wipeLegacyPlaintext(k))
}
