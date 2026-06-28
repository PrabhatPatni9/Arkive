import { sodium } from './sodium'
import type { KeyScope } from './keys'
import { openEnvelope } from './envelope'

export const GENESIS_HASH = '0'.repeat(64)

export interface Op {
  op_id: string
  scope: KeyScope
  key_epoch: number
  prev_hash: string
  lamport_clock: number
  author_device_id: string
  signature: string
  encrypted_payload: string
}

export interface OpWithHash extends Op {
  hash: string
}

function canonical(obj: Record<string, unknown>): string {
  const sorted = Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
  )
  return JSON.stringify(sorted)
}

function signedFields(op: Op & { hash?: string }): string {
  const { signature: _sig, hash: _h, ...rest } = op
  return canonical(rest as Record<string, unknown>)
}

export function hashOp(op: Op & { hash?: string }): string {
  const { hash: _h, ...opWithoutHash } = op
  const bytes = sodium.from_string(canonical(opWithoutHash as unknown as Record<string, unknown>))
  return sodium.to_hex(sodium.crypto_generichash(32, bytes, null))
}

export interface CreateOpParams {
  scope: KeyScope
  keyEpoch: number
  prevHash: string
  lamportClock: number
  authorDeviceId: string
  signingSecretKey: Uint8Array
  plaintextPayload: Uint8Array
  scopeKeyBytes: Uint8Array
}

export function createOp(
  params: CreateOpParams,
  sealFn: (key: Uint8Array, plain: Uint8Array) => Uint8Array
): OpWithHash {
  const op_id = sodium.to_hex(sodium.randombytes_buf(16))
  const partialOp: Omit<Op, 'signature'> = {
    op_id,
    scope: params.scope,
    key_epoch: params.keyEpoch,
    prev_hash: params.prevHash,
    lamport_clock: params.lamportClock,
    author_device_id: params.authorDeviceId,
    encrypted_payload: sodium.to_base64(
      sealFn(params.scopeKeyBytes, params.plaintextPayload)
    ),
  }
  const toSign = sodium.from_string(canonical(partialOp as Record<string, unknown>))
  const sigBytes = sodium.crypto_sign_detached(toSign, params.signingSecretKey)
  const op: Op = { ...partialOp, signature: sodium.to_base64(sigBytes) }
  return { ...op, hash: hashOp(op) }
}

export function verifyOp(op: Op & { hash?: string }, signingPublicKey: Uint8Array): boolean {
  try {
    const msg = sodium.from_string(signedFields(op))
    const sig = sodium.from_base64(op.signature)
    return sodium.crypto_sign_verify_detached(sig, msg, signingPublicKey)
  } catch {
    return false
  }
}

export function decryptOpPayload(op: Op, scopeKeyBytes: Uint8Array): Uint8Array {
  const envelope = sodium.from_base64(op.encrypted_payload)
  return openEnvelope(scopeKeyBytes, envelope)
}

export function verifyChainLink(op: Op, prevOpHash: string): boolean {
  return op.prev_hash === prevOpHash
}
