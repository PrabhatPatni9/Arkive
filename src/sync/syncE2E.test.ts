import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initSodium } from '../crypto/sodium'
import { generateScopeKey, generateSigningKeypair } from '../crypto/keys'
import { verifyOp, hashOp } from '../crypto/ops'
import type { OpWithHash } from '../crypto/ops'
import { MemoryOpLog } from '../db/opLog'
import {
  initSyncContext, clearSyncContext, materializeOp, whenEmitsSettled,
} from './syncContext'
import { addPolicy, getPolicies, deletePolicy } from '../modules/insurance/store'

// Shared localStorage stub (secureModuleStore falls back to plaintext when no family key — fine here)
const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { Reflect.deleteProperty(store, k) },
  clear: () => { Object.keys(store).forEach(k => Reflect.deleteProperty(store, k)) },
  key: (i: number) => Object.keys(store)[i] ?? null,
  length: 0,
}
function wipeStorage() { Object.keys(store).forEach(k => Reflect.deleteProperty(store, k)) }

beforeAll(async () => { await initSodium() })
beforeEach(() => { wipeStorage(); clearSyncContext() })

const FAM = 'fam-e2e'

describe('end-to-end record sync (store → op → other device → store)', () => {
  it('a policy added on device A materialises into device B via a signed op', async () => {
    const familyKey = generateScopeKey('family', 0)
    const deviceA = generateSigningKeypair()

    // The "wire": ops the engine would push to the relay.
    const wire: OpWithHash[] = []
    const logA = new MemoryOpLog()
    initSyncContext({
      opLog: logA,
      scopeKeyBytes: familyKey.bytes, keyForEpoch: () => familyKey.bytes,
      signingSecretKey: deviceA.secretKey,
      deviceId: 'device-A',
      keyEpoch: 0,
      onOp: (op) => wire.push(op),
    })

    // Device A creates a policy → store persists locally AND emits a record op.
    const policy = addPolicy({
      familyId: FAM, memberId: 'm1', insurer: 'Acme Health', policyNumber: 'POL-1',
      policyType: 'health', sumInsured: 500000, premium: 12000, premiumCycle: 'yearly',
      startDate: '2026-01-01', expiryDate: '2027-01-01',
    })
    await whenEmitsSettled()

    // Exactly one op on the wire; it is a valid, correctly-signed, correctly-hashed op.
    expect(wire).toHaveLength(1)
    const op = wire[0]
    expect(verifyOp(op, deviceA.publicKey)).toBe(true)
    expect(hashOp(op)).toBe(op.hash)

    // ── Simulate device B: fresh storage, same family key, its own op log. ──
    wipeStorage()
    clearSyncContext()
    const logB = new MemoryOpLog()
    initSyncContext({
      opLog: logB,
      scopeKeyBytes: familyKey.bytes, keyForEpoch: () => familyKey.bytes,   // B holds the family key too
      signingSecretKey: generateSigningKeypair().secretKey,
      deviceId: 'device-B',
      keyEpoch: 0,
    })

    // Device B starts with nothing, then receives + materialises A's op.
    expect(getPolicies(FAM)).toHaveLength(0)
    materializeOp(op)

    const onB = getPolicies(FAM)
    expect(onB).toHaveLength(1)
    expect(onB[0].policyId).toBe(policy.policyId)
    expect(onB[0].insurer).toBe('Acme Health')
    expect(onB[0].sumInsured).toBe(500000)
  })

  it('a delete on device A removes the record on device B', async () => {
    const familyKey = generateScopeKey('family', 0)
    const deviceA = generateSigningKeypair()
    const wire: OpWithHash[] = []
    initSyncContext({
      opLog: new MemoryOpLog(), scopeKeyBytes: familyKey.bytes, keyForEpoch: () => familyKey.bytes, signingSecretKey: deviceA.secretKey,
      deviceId: 'device-A', keyEpoch: 0, onOp: (op) => wire.push(op),
    })

    const p = addPolicy({
      familyId: FAM, memberId: 'm1', insurer: 'B', policyNumber: 'P2', policyType: 'life',
      sumInsured: 1, premium: 1, premiumCycle: 'yearly', startDate: '2026-01-01', expiryDate: '2027-01-01',
    })
    await whenEmitsSettled()
    deletePolicy(p.policyId)
    await whenEmitsSettled()
    expect(wire).toHaveLength(2)   // put, then delete

    // Device B applies both in order.
    wipeStorage(); clearSyncContext()
    initSyncContext({
      opLog: new MemoryOpLog(), scopeKeyBytes: familyKey.bytes, keyForEpoch: () => familyKey.bytes,
      signingSecretKey: generateSigningKeypair().secretKey, deviceId: 'device-B', keyEpoch: 0,
    })
    materializeOp(wire[0])
    expect(getPolicies(FAM)).toHaveLength(1)
    materializeOp(wire[1])
    expect(getPolicies(FAM)).toHaveLength(0)
  })

  it('emits nothing when sync is inactive (single-device still works locally)', () => {
    clearSyncContext()
    const p = addPolicy({
      familyId: FAM, memberId: 'm1', insurer: 'Local', policyNumber: 'P3', policyType: 'health',
      sumInsured: 1, premium: 1, premiumCycle: 'yearly', startDate: '2026-01-01', expiryDate: '2027-01-01',
    })
    expect(getPolicies(FAM).map(x => x.policyId)).toContain(p.policyId)
  })
})
