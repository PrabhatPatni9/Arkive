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
