import { sodium } from './sodium'

export const ENVELOPE_VERSION = 0x01 as const
export const ALGO = { XCHACHA20_POLY1305: 0x01 as const } as const

/**
 * Hard ceiling on a single envelope's payload (10 MB), enforced on both encrypt and
 * decrypt. Bounds memory use and stops a malformed/hostile envelope from forcing a huge
 * allocation. Large files belong in chunked/streamed blobs, not a single envelope.
 */
export const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024

// Layout: [version:1][algo:1][nonce:24][ciphertext+poly1305_tag]
const VERSION_OFFSET = 0
const ALGO_OFFSET = 1
const NONCE_OFFSET = 2
const NONCE_BYTES = 24
const HEADER_BYTES = 2 + NONCE_BYTES // 26

export function sealEnvelope(key: Uint8Array, plaintext: Uint8Array): Uint8Array {
  if (plaintext.length > MAX_PAYLOAD_BYTES) {
    throw new Error(`Envelope payload too large: ${plaintext.length} > ${MAX_PAYLOAD_BYTES}`)
  }
  const nonce = sodium.randombytes_buf(NONCE_BYTES)
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    null,
    null,
    nonce,
    key
  )
  const out = new Uint8Array(HEADER_BYTES + ciphertext.length)
  out[VERSION_OFFSET] = ENVELOPE_VERSION
  out[ALGO_OFFSET] = ALGO.XCHACHA20_POLY1305
  out.set(nonce, NONCE_OFFSET)
  out.set(ciphertext, HEADER_BYTES)
  return out
}

export function openEnvelope(key: Uint8Array, envelope: Uint8Array): Uint8Array {
  if (envelope.length < HEADER_BYTES + 1) {
    throw new Error('Envelope too short')
  }
  if (envelope.length > HEADER_BYTES + MAX_PAYLOAD_BYTES + 16 /* poly1305 tag */) {
    throw new Error('Envelope too large')
  }
  const version = envelope[VERSION_OFFSET]
  if (version !== ENVELOPE_VERSION) {
    throw new Error(`Unknown envelope version: 0x${version.toString(16)}`)
  }
  const algo = envelope[ALGO_OFFSET]
  if (algo !== ALGO.XCHACHA20_POLY1305) {
    throw new Error(`Unknown algorithm id: 0x${algo.toString(16)}`)
  }
  const nonce = envelope.slice(NONCE_OFFSET, NONCE_OFFSET + NONCE_BYTES)
  const ciphertext = envelope.slice(HEADER_BYTES)
  const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    null,
    nonce,
    key
  )
  if (!plaintext) throw new Error('Decryption failed — authentication tag mismatch')
  return plaintext
}
