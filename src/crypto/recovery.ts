import { sodium } from './sodium'
import { sealEnvelope, openEnvelope } from './envelope'
import type { ScopeKey, KeyScope } from './keys'

export interface RecoveryPackage {
  salt: string     // base64, 32 bytes
  wrappedKey: string // base64, envelope bytes
}

export interface ArgonParams {
  opsLimit: number
  memLimit: number
}

export function interactiveParams(): ArgonParams {
  return {
    opsLimit: sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    memLimit: sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
  }
}

export function moderateParams(): ArgonParams {
  return {
    opsLimit: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    memLimit: sodium.crypto_pwhash_MEMLIMIT_MODERATE,
  }
}

function deriveKeyFromCode(
  code: string,
  salt: Uint8Array,
  params: ArgonParams
): Uint8Array {
  return sodium.crypto_pwhash(
    32,
    code,
    salt,
    params.opsLimit,
    params.memLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  )
}

export function createRecoveryPackage(
  scopeKey: ScopeKey,
  code: string,
  params: ArgonParams
): RecoveryPackage {
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)
  const kdfKey = deriveKeyFromCode(code, salt, params)
  const plaintext = sodium.from_string(
    JSON.stringify({
      keyId: scopeKey.keyId,
      scope: scopeKey.scope,
      epoch: scopeKey.epoch,
      bytes: sodium.to_base64(scopeKey.bytes),
    })
  )
  const wrapped = sealEnvelope(kdfKey, plaintext)
  return {
    salt: sodium.to_base64(salt),
    wrappedKey: sodium.to_base64(wrapped),
  }
}

export function openRecoveryPackage(
  pkg: RecoveryPackage,
  code: string,
  params: ArgonParams,
  meta: { scope: KeyScope; epoch: number; keyId: string }
): ScopeKey {
  const salt = sodium.from_base64(pkg.salt)
  const kdfKey = deriveKeyFromCode(code, salt, params)
  const wrapped = sodium.from_base64(pkg.wrappedKey)
  const plaintext = openEnvelope(kdfKey, wrapped)
  const parsed = JSON.parse(sodium.to_string(plaintext)) as {
    keyId: string; scope: KeyScope; epoch: number; bytes: string
  }
  if (parsed.keyId !== meta.keyId || parsed.scope !== meta.scope || parsed.epoch !== meta.epoch) {
    throw new Error('openRecoveryPackage: metadata mismatch')
  }
  return {
    keyId: parsed.keyId,
    scope: parsed.scope,
    epoch: parsed.epoch,
    bytes: sodium.from_base64(parsed.bytes),
  }
}

/**
 * A blob encrypted under a user passphrase. The Argon2id parameters and salt are stored
 * alongside the ciphertext so it can be decrypted on any device with only the passphrase,
 * and so a future params change does not strand old exports.
 */
export interface PassphraseSealed {
  v: 1
  alg: 'argon2id13'
  opsLimit: number
  memLimit: number
  salt: string      // base64
  envelope: string  // base64 — XChaCha20-Poly1305 envelope
}

/** Derive a 32-byte key from a passphrase and seal `plaintext` under it. */
export function sealWithPassphrase(
  plaintext: Uint8Array,
  passphrase: string,
  params: ArgonParams = moderateParams()
): PassphraseSealed {
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)
  const key = deriveKeyFromCode(passphrase, salt, params)
  return {
    v: 1,
    alg: 'argon2id13',
    opsLimit: params.opsLimit,
    memLimit: params.memLimit,
    salt: sodium.to_base64(salt),
    envelope: sodium.to_base64(sealEnvelope(key, plaintext)),
  }
}

/** Reverse of {@link sealWithPassphrase}. Throws if the passphrase is wrong (auth-tag fail). */
export function openWithPassphrase(sealed: PassphraseSealed, passphrase: string): Uint8Array {
  const salt = sodium.from_base64(sealed.salt)
  const key = deriveKeyFromCode(passphrase, salt, {
    opsLimit: sealed.opsLimit,
    memLimit: sealed.memLimit,
  })
  return openEnvelope(key, sodium.from_base64(sealed.envelope))
}
