import { sodium } from './sodium'

// 6-digit verification code derived from both parties' X25519 public keys.
// Uses BLAKE2b(8 bytes) of requester_pubkey || admin_pubkey, then mod 10^6.
export function deriveVerificationCode(
  requesterPublicKey: Uint8Array,
  adminPublicKey: Uint8Array
): string {
  const combined = new Uint8Array(requesterPublicKey.length + adminPublicKey.length)
  combined.set(requesterPublicKey, 0)
  combined.set(adminPublicKey, requesterPublicKey.length)
  const hashBytes = sodium.crypto_generichash(8, combined)
  const view = new DataView(hashBytes.buffer, hashBytes.byteOffset, 4)
  const num = view.getUint32(0, false) // big-endian
  const code = (num % 1_000_000).toString().padStart(6, '0')
  return code
}

// Constant-time string comparison via XOR of char codes.
export function codesMatch(codeA: string, codeB: string): boolean {
  if (codeA.length !== codeB.length) return false
  let diff = 0
  for (let i = 0; i < codeA.length; i++) {
    diff |= codeA.charCodeAt(i) ^ codeB.charCodeAt(i)
  }
  return diff === 0
}
