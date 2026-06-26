import { sodium } from '../crypto/sodium'
import { sealEnvelope, openEnvelope } from '../crypto/envelope'
import type { EncryptionKeypair } from '../crypto/keys'

export const DOC_KEY_BYTES = 32

export function generateDocumentKey(): Uint8Array {
  return sodium.randombytes_buf(DOC_KEY_BYTES)
}

export function encryptDocument(docKey: Uint8Array, plaintext: Uint8Array): Uint8Array {
  return sealEnvelope(docKey, plaintext)
}

export function decryptDocument(docKey: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  return openEnvelope(docKey, ciphertext)
}

// BLAKE2b-256 as hex — same primitive as op hash function for consistency
export function contentHash(data: Uint8Array): string {
  return sodium.to_hex(sodium.crypto_generichash(32, data, null))
}

// Wrap a per-document key for a specific recipient using sealed box
export function wrapDocumentKey(
  docKey: Uint8Array,
  recipientPublicKey: Uint8Array
): Uint8Array {
  return sodium.crypto_box_seal(docKey, recipientPublicKey)
}

export function unwrapDocumentKey(
  wrapped: Uint8Array,
  recipientKeypair: EncryptionKeypair
): Uint8Array {
  const result = sodium.crypto_box_seal_open(
    wrapped,
    recipientKeypair.publicKey,
    recipientKeypair.secretKey
  )
  if (!result) throw new Error('unwrapDocumentKey: authentication failed')
  return result
}
