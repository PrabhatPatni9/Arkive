export { initSodium, sodium } from './sodium'
export { sealEnvelope, openEnvelope, ENVELOPE_VERSION, ALGO } from './envelope'
export {
  generateScopeKey,
  generateEncryptionKeypair,
  generateSigningKeypair,
  wrapKeyTo,
  unwrapKey,
  rotateKey,
  encryptScopeKeyForStorage,
  decryptScopeKeyFromStorage,
  SYMMETRIC_KEY_BYTES,
} from './keys'
export type { ScopeKey, EncryptionKeypair, SigningKeypair, KeyScope } from './keys'
export {
  createOp,
  verifyOp,
  decryptOpPayload,
  hashOp,
  verifyChainLink,
  GENESIS_HASH,
} from './ops'
export type { Op, OpWithHash, CreateOpParams } from './ops'
export { computeThreshold, splitKey, reconstructKey } from './threshold'
export type { SplitResult } from './threshold'
export {
  createRecoveryPackage,
  openRecoveryPackage,
  interactiveParams,
  moderateParams,
  sealWithPassphrase,
  openWithPassphrase,
} from './recovery'
export type { RecoveryPackage, ArgonParams, PassphraseSealed } from './recovery'
export { deriveVerificationCode, codesMatch } from './handshake'
