import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initSodium, sodium } from '../crypto/sodium'
import { generateEncryptionKeypair, generateSigningKeypair, generateScopeKey } from '../crypto/keys'
import type { OpWithHash } from '../crypto/ops'
import { MemoryOpLog } from '../db/opLog'
import {
  initSyncContext, clearSyncContext, materializeOp, whenEmitsSettled, registerStoreHandler,
} from '../sync/syncContext'
import {
  saveFamily, getFamily, clearFamily, removeMemberAndRotate,
  applyKeyRotationFromSync, applyMemberProfileFromSync, familyKeyBytesForEpoch,
  MEMBERS_STORE, KEYS_STORE,
} from './familyStore'
import type { FamilyState, FamilyMember, StoredKeypair } from './familyStore'
import { addPolicy, getPolicies } from '../modules/insurance/store'

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

beforeAll(async () => {
  await initSodium()
  // App.tsx registers these at boot; the unit test wires them up directly.
  registerStoreHandler(MEMBERS_STORE, applyMemberProfileFromSync)
  registerStoreHandler(KEYS_STORE, applyKeyRotationFromSync)
})
beforeEach(() => { wipe(); clearFamily(); clearSyncContext() })

// Three people, each with a device enc + sig keypair. Epoch-0 family key shared by all.
function setup() {
  const encA = generateEncryptionKeypair(), sigA = generateSigningKeypair()
  const encB = generateEncryptionKeypair(), sigB = generateSigningKeypair()
  const encM = generateEncryptionKeypair(), sigM = generateSigningKeypair()
  const familyKey0 = generateScopeKey('family', 0)

  const kp = (pub: Uint8Array, sec: Uint8Array): StoredKeypair => ({
    publicKey: sodium.to_base64(pub), secretKey: sodium.to_base64(sec),
  })
  const member = (id: string, role: FamilyMember['role'], enc: { publicKey: Uint8Array }, sig: { publicKey: Uint8Array }): FamilyMember => ({
    memberId: id, name: id, role, deviceId: `dev-${id}`,
    encPublicKey: sodium.to_base64(enc.publicKey), sigPublicKey: sodium.to_base64(sig.publicKey),
    isDependent: false,
  })
  const members = [
    member('A', 'admin', encA, sigA),
    member('B', 'member', encB, sigB),
    member('M', 'member', encM, sigM),
  ]

  function stateFor(who: 'A' | 'B' | 'M', enc: typeof encA, sig: typeof sigA, role: FamilyMember['role']): FamilyState {
    return {
      familyId: 'fam', familyName: 'Fam', familyType: 'nuclear', createdAt: '2026-01-01',
      deviceId: `dev-${who}`, deviceLabel: who,
      deviceEncKeypair: kp(enc.publicKey, enc.secretKey),
      deviceSigKeypair: kp(sig.publicKey, sig.secretKey),
      familyKey: { keyId: familyKey0.keyId, scope: 'family', epoch: 0, bytes: sodium.to_base64(familyKey0.bytes) },
      recoveryPackage: null, myMemberId: who, role,
      backupAdminMemberId: null, members: members.map(m => ({ ...m })),
      emergencyCardEnabled: {}, relayDeviceToken: null,
    }
  }
  return { encA, sigA, encB, sigB, encM, sigM, familyKey0, stateFor }
}

function initCtxForCurrentFamily(sigSecretB64: string, deviceId: string, wire?: OpWithHash[]) {
  const fam = getFamily()
  if (!fam) throw new Error('no family')
  initSyncContext({
    opLog: new MemoryOpLog(),
    scopeKeyBytes: sodium.from_base64(fam.familyKey.bytes),
    keyEpoch: fam.familyKey.epoch,
    keyForEpoch: familyKeyBytesForEpoch,
    signingSecretKey: sodium.from_base64(sigSecretB64),
    deviceId,
    onOp: wire ? (op) => wire.push(op) : undefined,
  })
}

describe('member removal + forward-only key rotation', () => {
  it('rotates the key: a remaining device reads new data; the removed device cannot', async () => {
    const s = setup()

    // ── Device A (admin) removes M and rotates. ──
    saveFamily(s.stateFor('A', s.encA, s.sigA, 'admin'))
    const wire: OpWithHash[] = []
    initCtxForCurrentFamily(sodium.to_base64(s.sigA.secretKey), 'dev-A', wire)

    removeMemberAndRotate('M')
    await whenEmitsSettled()
    // A emits the key-rotation op + the member-delete op.
    expect(wire).toHaveLength(2)
    const keyOp = wire[0]
    const delOp = wire[1]
    expect(getFamily()?.familyKey.epoch).toBe(1)              // A now on epoch 1
    expect(getFamily()?.members.some(m => m.memberId === 'M')).toBe(false)

    // A writes a policy under the NEW epoch.
    addPolicy({
      familyId: 'fam', memberId: 'A', insurer: 'NewEpoch', policyNumber: 'N1', policyType: 'health',
      sumInsured: 1, premium: 1, premiumCycle: 'yearly', startDate: '2026-01-01', expiryDate: '2027-01-01',
    })
    await whenEmitsSettled()
    const policyOp = wire[2]
    expect(policyOp.key_epoch).toBe(1)

    // ── Device B (remaining) receives everything. ──
    wipe(); clearFamily(); clearSyncContext()
    saveFamily(s.stateFor('B', s.encB, s.sigB, 'member'))
    initCtxForCurrentFamily(sodium.to_base64(s.sigB.secretKey), 'dev-B')

    materializeOp(keyOp)                                       // B unwraps the new key
    expect(getFamily()?.familyKey.epoch).toBe(1)
    materializeOp(delOp)                                       // B removes M
    expect(getFamily()?.members.some(m => m.memberId === 'M')).toBe(false)
    materializeOp(policyOp)                                    // B decrypts new-epoch data
    expect(getPolicies('fam').map(p => p.insurer)).toContain('NewEpoch')

    // ── Device M (removed) cannot get the new key or read new data. ──
    wipe(); clearFamily(); clearSyncContext()
    saveFamily(s.stateFor('M', s.encM, s.sigM, 'member'))
    initCtxForCurrentFamily(sodium.to_base64(s.sigM.secretKey), 'dev-M')

    materializeOp(keyOp)                                       // no key sealed to M
    expect(getFamily()?.familyKey.epoch).toBe(0)              // still old epoch
    materializeOp(policyOp)                                    // can't decrypt new-epoch op
    expect(getPolicies('fam')).toHaveLength(0)
  })

  it('a non-admin cannot force a rotation or a member removal', () => {
    const s = setup()
    saveFamily(s.stateFor('B', s.encB, s.sigB, 'member'))
    initCtxForCurrentFamily(sodium.to_base64(s.sigB.secretKey), 'dev-B')

    // A member-delete op authored by a NON-admin device is ignored.
    const forgedDelete = { id: 'A', action: 'delete' as const, store: 'family_members', idKey: 'memberId' }
    applyMemberProfileFromSync(forgedDelete, { author_device_id: 'dev-B' } as never)
    expect(getFamily()?.members.some(m => m.memberId === 'A')).toBe(true)

    // A key-rotation op from a non-admin is ignored.
    applyKeyRotationFromSync(
      { record: { newEpoch: 5, keyId: 'x', wrapped: {} } },
      { author_device_id: 'dev-B' } as never,
    )
    expect(getFamily()?.familyKey.epoch).toBe(0)
  })

  it('only an admin can call removeMemberAndRotate', () => {
    const s = setup()
    saveFamily(s.stateFor('B', s.encB, s.sigB, 'member'))
    expect(() => removeMemberAndRotate('M')).toThrow(/admin/)
  })
})
