import { describe, it, expect, beforeAll } from 'vitest'
import { initSodium, sodium } from './sodium'
import { sealEnvelope, openEnvelope, ENVELOPE_VERSION } from './envelope'
import {
  generateScopeKey,
  generateEncryptionKeypair,
  generateSigningKeypair,
  wrapKeyTo,
  unwrapKey,
  rotateKey,
} from './keys'
import {
  createOp,
  verifyOp,
  decryptOpPayload,
  hashOp,
  verifyChainLink,
  GENESIS_HASH,
} from './ops'
import { computeThreshold, splitKey, reconstructKey } from './threshold'
import { createRecoveryPackage, openRecoveryPackage, interactiveParams } from './recovery'
import { deriveVerificationCode, codesMatch } from './handshake'
import { MemoryOpLog } from '../db/opLog'

beforeAll(async () => {
  await initSodium()
})

// ─── Envelope ────────────────────────────────────────────────────────────────

describe('envelope', () => {
  it('round-trips plaintext', () => {
    const key = sodium.randombytes_buf(32)
    const plain = sodium.from_string('hello arkive')
    const env = sealEnvelope(key, plain)
    const recovered = openEnvelope(key, env)
    expect(recovered).toEqual(plain)
  })

  it('preserves version byte', () => {
    const key = sodium.randombytes_buf(32)
    const env = sealEnvelope(key, sodium.from_string('x'))
    expect(env[0]).toBe(ENVELOPE_VERSION)
  })

  it('throws on wrong key', () => {
    const key = sodium.randombytes_buf(32)
    const wrongKey = sodium.randombytes_buf(32)
    const env = sealEnvelope(key, sodium.from_string('secret'))
    expect(() => openEnvelope(wrongKey, env)).toThrow()
  })

  it('throws on tampered ciphertext', () => {
    const key = sodium.randombytes_buf(32)
    const env = sealEnvelope(key, sodium.from_string('data'))
    const tampered = new Uint8Array(env)
    tampered[tampered.length - 1] ^= 0xff
    expect(() => openEnvelope(key, tampered)).toThrow()
  })

  it('throws on unknown version byte', () => {
    const key = sodium.randombytes_buf(32)
    const env = sealEnvelope(key, sodium.from_string('data'))
    const bad = new Uint8Array(env)
    bad[0] = 0xff
    expect(() => openEnvelope(key, bad)).toThrow(/Unknown envelope version/)
  })
})

// ─── Keys ────────────────────────────────────────────────────────────────────

describe('keys', () => {
  it('generates distinct scope keys', () => {
    const k1 = generateScopeKey('family')
    const k2 = generateScopeKey('family')
    expect(k1.keyId).not.toBe(k2.keyId)
    expect(k1.bytes).not.toEqual(k2.bytes)
  })

  it('generates distinct encryption keypairs', () => {
    const a = generateEncryptionKeypair()
    const b = generateEncryptionKeypair()
    expect(a.publicKey).not.toEqual(b.publicKey)
  })

  it('generates distinct signing keypairs', () => {
    const a = generateSigningKeypair()
    const b = generateSigningKeypair()
    expect(a.publicKey).not.toEqual(b.publicKey)
  })

  it('wrap/unwrap round-trips a scope key', () => {
    const kp = generateEncryptionKeypair()
    const sk = generateScopeKey('node', 1)
    const sealed = wrapKeyTo(sk, kp.publicKey)
    const recovered = unwrapKey(sealed, kp, 'node', 1, sk.keyId)
    expect(recovered.bytes).toEqual(sk.bytes)
    expect(recovered.epoch).toBe(1)
    expect(recovered.keyId).toBe(sk.keyId)
  })

  it('unwrap fails with wrong recipient', () => {
    const kp1 = generateEncryptionKeypair()
    const kp2 = generateEncryptionKeypair()
    const sk = generateScopeKey('member')
    const sealed = wrapKeyTo(sk, kp1.publicKey)
    expect(() => unwrapKey(sealed, kp2, 'member', 0, sk.keyId)).toThrow()
  })

  it('rotateKey increments epoch and changes bytes', () => {
    const sk = generateScopeKey('family', 0)
    const rotated = rotateKey(sk)
    expect(rotated.epoch).toBe(1)
    expect(rotated.bytes).not.toEqual(sk.bytes)
    expect(rotated.scope).toBe('family')
  })
})

// ─── Ops ─────────────────────────────────────────────────────────────────────

describe('ops', () => {
  it('creates a signed op and verifies it', () => {
    const sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('family')
    const payload = sodium.from_string('test payload')
    const op = createOp(
      {
        scope: 'family',
        keyEpoch: 0,
        prevHash: GENESIS_HASH,
        lamportClock: 1,
        authorDeviceId: 'device-1',
        signingSecretKey: sigKp.secretKey,
        plaintextPayload: payload,
        scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    expect(verifyOp(op, sigKp.publicKey)).toBe(true)
  })

  it('rejects tampered payload', () => {
    const sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('family')
    const op = createOp(
      {
        scope: 'family', keyEpoch: 0, prevHash: GENESIS_HASH, lamportClock: 1,
        authorDeviceId: 'dev', signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('data'), scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    const tampered = { ...op, encrypted_payload: op.encrypted_payload.slice(0, -4) + 'ZZZZ' }
    expect(verifyOp(tampered, sigKp.publicKey)).toBe(false)
  })

  it('rejects signature from wrong signing key', () => {
    const sigKp = generateSigningKeypair()
    const wrongKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('family')
    const op = createOp(
      {
        scope: 'family', keyEpoch: 0, prevHash: GENESIS_HASH, lamportClock: 1,
        authorDeviceId: 'dev', signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('data'), scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    expect(verifyOp(op, wrongKp.publicKey)).toBe(false)
  })

  it('decrypts op payload with correct scope key', () => {
    const sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('family')
    const payload = sodium.from_string('secret data')
    const op = createOp(
      {
        scope: 'family', keyEpoch: 0, prevHash: GENESIS_HASH, lamportClock: 1,
        authorDeviceId: 'dev', signingSecretKey: sigKp.secretKey,
        plaintextPayload: payload, scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    const recovered = decryptOpPayload(op, scopeKey.bytes)
    expect(recovered).toEqual(payload)
  })

  it('fails to decrypt op payload with wrong epoch key', () => {
    const sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('family', 0)
    const wrongKey = generateScopeKey('family', 1)
    const op = createOp(
      {
        scope: 'family', keyEpoch: 0, prevHash: GENESIS_HASH, lamportClock: 1,
        authorDeviceId: 'dev', signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('data'), scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    expect(() => decryptOpPayload(op, wrongKey.bytes)).toThrow()
  })

  it('hash chain links correctly', () => {
    const sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('family')
    const op1 = createOp(
      {
        scope: 'family', keyEpoch: 0, prevHash: GENESIS_HASH, lamportClock: 1,
        authorDeviceId: 'dev', signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('a'), scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    const op2 = createOp(
      {
        scope: 'family', keyEpoch: 0, prevHash: op1.hash, lamportClock: 2,
        authorDeviceId: 'dev', signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('b'), scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    expect(verifyChainLink(op2, op1.hash)).toBe(true)
  })

  it('detects broken chain link', () => {
    const sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('family')
    const op = createOp(
      {
        scope: 'family', keyEpoch: 0, prevHash: GENESIS_HASH, lamportClock: 1,
        authorDeviceId: 'dev', signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('a'), scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    expect(verifyChainLink(op, 'wrong'.repeat(13))).toBe(false)
  })

  it('MemoryOpLog tracks head and getByHash', async () => {
    const log = new MemoryOpLog()
    const sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('family')
    const op1 = createOp(
      {
        scope: 'family', keyEpoch: 0, prevHash: GENESIS_HASH, lamportClock: 1,
        authorDeviceId: 'dev', signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('a'), scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    const op2 = createOp(
      {
        scope: 'family', keyEpoch: 0, prevHash: op1.hash, lamportClock: 2,
        authorDeviceId: 'dev', signingSecretKey: sigKp.secretKey,
        plaintextPayload: sodium.from_string('b'), scopeKeyBytes: scopeKey.bytes,
      },
      sealEnvelope
    )
    await log.append(op1)
    await log.append(op2)
    const head = await log.getHead('family')
    expect(head?.hash).toBe(op2.hash)
    const found = await log.getByHash(op1.hash)
    expect(found?.op_id).toBe(op1.op_id)
  })
})

// ─── Threshold ───────────────────────────────────────────────────────────────

describe('threshold', () => {
  const cases: [number, number][] = [
    [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
    [6, 2], [7, 3], [10, 3], [20, 6], [100, 6],
  ]

  it.each(cases)('computeThreshold(%i) === %i', (n, expected) => {
    expect(computeThreshold(n)).toBe(expected)
  })

  it('threshold differs when N differs', () => {
    expect(computeThreshold(6)).not.toBe(computeThreshold(20))
  })

  it('split and reconstruct with exactly M shares', () => {
    const key = sodium.randombytes_buf(32)
    const personCount = 7 // threshold = 3
    const { shares, threshold } = splitKey(key, personCount)
    expect(threshold).toBe(3)
    const recovered = reconstructKey(shares.slice(0, threshold))
    expect(recovered).toEqual(key)
  })

  it('split and reconstruct with all N shares', () => {
    const key = sodium.randombytes_buf(32)
    const { shares } = splitKey(key, 5)
    const recovered = reconstructKey(shares)
    expect(recovered).toEqual(key)
  })

  it('M-1 shares cannot reconstruct key', () => {
    const key = sodium.randombytes_buf(32)
    const personCount = 10 // threshold = 3
    const { shares, threshold } = splitKey(key, personCount)
    const partial = shares.slice(0, threshold - 1)
    // shamirs-secret-sharing returns garbage bytes, not an error, with too few shares
    const wrong = reconstructKey(partial)
    expect(wrong).not.toEqual(key)
  })
})

// ─── Recovery ────────────────────────────────────────────────────────────────

describe('recovery', () => {
  it('round-trips a scope key with correct code', () => {
    const scopeKey = generateScopeKey('family', 0)
    const code = 'word1 word2 word3 word4 word5 word6'
    const params = interactiveParams()
    const pkg = createRecoveryPackage(scopeKey, code, params)
    const recovered = openRecoveryPackage(pkg, code, params, {
      scope: 'family', epoch: 0, keyId: scopeKey.keyId,
    })
    expect(recovered.bytes).toEqual(scopeKey.bytes)
  })

  it('throws on wrong recovery code', () => {
    const scopeKey = generateScopeKey('family', 0)
    const params = interactiveParams()
    const pkg = createRecoveryPackage(scopeKey, 'correct code here', params)
    expect(() =>
      openRecoveryPackage(pkg, 'wrong code here!', params, {
        scope: 'family', epoch: 0, keyId: scopeKey.keyId,
      })
    ).toThrow()
  })
})

// ─── Handshake ───────────────────────────────────────────────────────────────

describe('handshake', () => {
  it('both sides derive the same 6-digit code', () => {
    const requester = generateEncryptionKeypair()
    const admin = generateEncryptionKeypair()
    const codeA = deriveVerificationCode(requester.publicKey, admin.publicKey)
    const codeB = deriveVerificationCode(requester.publicKey, admin.publicKey)
    expect(codeA).toBe(codeB)
    expect(codeA).toHaveLength(6)
    expect(/^\d{6}$/.test(codeA)).toBe(true)
  })

  it('swapped keys produce a different code', () => {
    const requester = generateEncryptionKeypair()
    const admin = generateEncryptionKeypair()
    const code1 = deriveVerificationCode(requester.publicKey, admin.publicKey)
    const code2 = deriveVerificationCode(admin.publicKey, requester.publicKey)
    expect(code1).not.toBe(code2)
  })

  it('different keypairs produce different codes', () => {
    const r1 = generateEncryptionKeypair()
    const r2 = generateEncryptionKeypair()
    const admin = generateEncryptionKeypair()
    expect(deriveVerificationCode(r1.publicKey, admin.publicKey))
      .not.toBe(deriveVerificationCode(r2.publicKey, admin.publicKey))
  })

  it('codesMatch returns true for identical codes', () => {
    expect(codesMatch('123456', '123456')).toBe(true)
  })

  it('codesMatch returns false for different codes', () => {
    expect(codesMatch('123456', '123457')).toBe(false)
  })

  it('codesMatch returns false for different lengths', () => {
    expect(codesMatch('123', '123456')).toBe(false)
  })
})
