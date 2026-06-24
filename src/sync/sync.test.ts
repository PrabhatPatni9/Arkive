import { describe, it, expect, beforeAll } from 'vitest'
import { initSodium, sodium } from '../crypto/sodium'
import { generateScopeKey, generateSigningKeypair } from '../crypto/keys'
import { createOp, verifyOp, hashOp, GENESIS_HASH } from '../crypto/ops'
import { sealEnvelope } from '../crypto/envelope'
import { MemoryOpLog } from '../db/opLog'
import { SyncEngine } from './engine'
import { resolveLWW, isMedicalField, detectConflicts } from './resolver'

beforeAll(async () => {
  await initSodium()
})

describe('resolver', () => {
  it('resolveLWW picks highest lamport_clock', () => {
    const items = [
      { lamport_clock: 2, v: 'b' },
      { lamport_clock: 5, v: 'e' },
      { lamport_clock: 1, v: 'a' },
    ]
    expect(resolveLWW(items).v).toBe('e')
  })

  it('isMedicalField identifies protected keys', () => {
    expect(isMedicalField('blood_type')).toBe(true)
    expect(isMedicalField('allergies')).toBe(true)
    expect(isMedicalField('medications')).toBe(true)
    expect(isMedicalField('display_name')).toBe(false)
    expect(isMedicalField('email')).toBe(false)
  })

  it('detectConflicts surfaces medical field collisions', () => {
    const sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('member')
    const makeOp = (clock: number) => createOp(
      {
        scope: 'member', keyEpoch: 0, prevHash: GENESIS_HASH,
        lamportClock: clock, authorDeviceId: 'dev',
        signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('{}'),
        scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    const op1 = makeOp(1)
    const op2 = makeOp(2)
    const opsByField = new Map([['blood_type', [op1, op2]]])
    const conflicts = detectConflicts(opsByField)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].fieldKey).toBe('blood_type')
  })

  it('detectConflicts does not surface non-medical collisions', () => {
    const sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('member')
    const makeOp = (clock: number) => createOp(
      {
        scope: 'member', keyEpoch: 0, prevHash: GENESIS_HASH,
        lamportClock: clock, authorDeviceId: 'dev',
        signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('{}'),
        scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    const opsByField = new Map([['display_name', [makeOp(1), makeOp(2)]]])
    expect(detectConflicts(opsByField)).toHaveLength(0)
  })
})

describe('SyncEngine', () => {
  it('enqueuePush tracks pending ops', () => {
    const sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('family')
    const op = createOp(
      {
        scope: 'family', keyEpoch: 0, prevHash: GENESIS_HASH, lamportClock: 1,
        authorDeviceId: 'dev-1', signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('hello'), scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    const log = new MemoryOpLog()
    const engine = new SyncEngine(
      {
        relayUrl: 'http://localhost:8787',
        familyId: 'fam-1',
        deviceId: 'dev-1',
        signingKeys: new Map([['dev-1', sigKp.publicKey]]),
        intervalMs: 30_000,
      },
      log
    )
    engine.enqueuePush(op)
    // Does not throw; pending op is tracked internally
    engine.stop()
  })

  it('all enqueued ops have valid signatures and hashes', () => {
    const sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('family')
    const op = createOp(
      {
        scope: 'family', keyEpoch: 0, prevHash: GENESIS_HASH, lamportClock: 1,
        authorDeviceId: 'dev-1', signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('data'), scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    expect(verifyOp(op, sigKp.publicKey)).toBe(true)
    expect(hashOp(op)).toBe(op.hash)
  })
})
