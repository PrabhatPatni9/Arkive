import { describe, it, expect, beforeAll } from 'vitest'
import { initSodium, sodium } from '../crypto/sodium'
import { generateEncryptionKeypair, generateScopeKey, generateSigningKeypair } from '../crypto/keys'
import {
  generateDocumentKey,
  encryptDocument,
  decryptDocument,
  contentHash,
  wrapDocumentKey,
  unwrapDocumentKey,
} from './documentCrypto'
import { StubOcrService } from './ocrService'

beforeAll(async () => {
  await initSodium()
})

describe('documentCrypto', () => {
  it('encrypts and decrypts document bytes round-trip', () => {
    const key = generateDocumentKey()
    const plain = sodium.from_string('sensitive family document')
    expect(decryptDocument(key, encryptDocument(key, plain))).toEqual(plain)
  })

  it('throws on wrong document key', () => {
    const key = generateDocumentKey()
    const wrongKey = generateDocumentKey()
    expect(() => decryptDocument(wrongKey, encryptDocument(key, sodium.from_string('x')))).toThrow()
  })

  it('contentHash is deterministic', () => {
    const data = sodium.from_string('doc')
    expect(contentHash(data)).toBe(contentHash(data))
  })

  it('contentHash differs for different inputs', () => {
    expect(contentHash(sodium.from_string('a'))).not.toBe(contentHash(sodium.from_string('b')))
  })

  it('contentHash is 64 hex chars (32 bytes)', () => {
    expect(contentHash(sodium.from_string('x'))).toHaveLength(64)
  })

  it('wrapDocumentKey / unwrapDocumentKey round-trips', () => {
    const kp = generateEncryptionKeypair()
    const docKey = generateDocumentKey()
    const wrapped = wrapDocumentKey(docKey, kp.publicKey)
    expect(unwrapDocumentKey(wrapped, kp)).toEqual(docKey)
  })

  it('unwrapDocumentKey throws with wrong keypair', () => {
    const kp1 = generateEncryptionKeypair()
    const kp2 = generateEncryptionKeypair()
    const wrapped = wrapDocumentKey(generateDocumentKey(), kp1.publicKey)
    expect(() => unwrapDocumentKey(wrapped, kp2)).toThrow()
  })

  it('per-doc key is independent from scope key', () => {
    const _sigKp = generateSigningKeypair()
    const scopeKey = generateScopeKey('family')
    const docKey = generateDocumentKey()
    expect(docKey).toHaveLength(32)
    expect(docKey).not.toEqual(scopeKey.bytes)
  })
})

describe('StubOcrService', () => {
  it('isAvailable returns false', async () => {
    expect(await new StubOcrService().isAvailable()).toBe(false)
  })

  it('recognize returns empty result', async () => {
    const result = await new StubOcrService().recognize('any')
    expect(result.text).toBe('')
    expect(result.blocks).toHaveLength(0)
  })
})
