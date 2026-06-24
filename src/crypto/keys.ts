import { sodium } from './sodium'
import { sealEnvelope, openEnvelope } from './envelope'

export type KeyScope = 'family' | 'node' | 'member'
export const SYMMETRIC_KEY_BYTES = 32

export interface ScopeKey {
  keyId: string
  scope: KeyScope
  epoch: number
  bytes: Uint8Array
}

export interface EncryptionKeypair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export interface SigningKeypair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export function generateScopeKey(scope: KeyScope, epoch = 0): ScopeKey {
  const bytes = sodium.randombytes_buf(SYMMETRIC_KEY_BYTES)
  const keyId = sodium.to_hex(sodium.randombytes_buf(16))
  return { keyId, scope, epoch, bytes }
}

export function generateEncryptionKeypair(): EncryptionKeypair {
  const kp = sodium.crypto_box_keypair()
  return { publicKey: kp.publicKey, secretKey: kp.privateKey }
}

export function generateSigningKeypair(): SigningKeypair {
  const kp = sodium.crypto_sign_keypair()
  return { publicKey: kp.publicKey, secretKey: kp.privateKey }
}

// Wrap a scope key for a specific recipient using sealed box (X25519 + XSalsa20-Poly1305).
// Returns the sealed box bytes (includes ephemeral pubkey).
export function wrapKeyTo(
  scopeKey: ScopeKey,
  recipientPublicKey: Uint8Array
): Uint8Array {
  const payload = JSON.stringify({
    keyId: scopeKey.keyId,
    scope: scopeKey.scope,
    epoch: scopeKey.epoch,
    bytes: sodium.to_base64(scopeKey.bytes),
  })
  return sodium.crypto_box_seal(
    sodium.from_string(payload),
    recipientPublicKey
  )
}

export function unwrapKey(
  sealed: Uint8Array,
  recipientKeypair: EncryptionKeypair,
  scope: KeyScope,
  epoch: number,
  keyId: string
): ScopeKey {
  const rawBytes = sodium.crypto_box_seal_open(
    sealed,
    recipientKeypair.publicKey,
    recipientKeypair.secretKey
  )
  if (!rawBytes) throw new Error('unwrapKey: sealed box open failed')
  const parsed = JSON.parse(sodium.to_string(rawBytes)) as {
    keyId: string; scope: KeyScope; epoch: number; bytes: string
  }
  if (parsed.keyId !== keyId || parsed.scope !== scope || parsed.epoch !== epoch) {
    throw new Error('unwrapKey: metadata mismatch')
  }
  return {
    keyId: parsed.keyId,
    scope: parsed.scope,
    epoch: parsed.epoch,
    bytes: sodium.from_base64(parsed.bytes),
  }
}

export function rotateKey(current: ScopeKey): ScopeKey {
  return generateScopeKey(current.scope, current.epoch + 1)
}

// Encrypt a scope key's bytes using XChaCha20-Poly1305 (for local storage).
export function encryptScopeKeyForStorage(
  scopeKey: ScopeKey,
  storageKey: Uint8Array
): Uint8Array {
  const { sealEnvelope: seal } = { sealEnvelope }
  const meta = JSON.stringify({ keyId: scopeKey.keyId, scope: scopeKey.scope, epoch: scopeKey.epoch })
  const combined = sodium.from_string(meta + '|') 
  const payload = new Uint8Array(combined.length + scopeKey.bytes.length)
  payload.set(combined, 0)
  payload.set(scopeKey.bytes, combined.length)
  return seal(storageKey, payload)
}

export function decryptScopeKeyFromStorage(
  envelope: Uint8Array,
  storageKey: Uint8Array
): ScopeKey {
  const plaintext = openEnvelope(storageKey, envelope)
  const raw = sodium.to_string(plaintext)
  const pipeIdx = raw.indexOf('|')
  const meta = JSON.parse(raw.slice(0, pipeIdx)) as { keyId: string; scope: KeyScope; epoch: number }
  const keyBytes = plaintext.slice(sodium.from_string(raw.slice(0, pipeIdx + 1)).length)
  return { keyId: meta.keyId, scope: meta.scope, epoch: meta.epoch, bytes: keyBytes }
}
