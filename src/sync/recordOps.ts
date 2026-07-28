/**
 * Record ops — the bridge between the local record stores and the encrypted op log.
 *
 * A "record op" is a normal signed, hash-chained `Op` whose encrypted payload describes a single
 * change to a record set: put (create/update) or delete a record identified by `id` inside a
 * named store. Emitting one on every local mutation, and materialising received ones back into
 * the stores, is what makes family data actually sync across devices (the previously-missing link).
 *
 * The payload is sealed with the family scope key, so the relay only ever sees ciphertext.
 */
import { createOp } from '../crypto/ops'
import type { Op, OpWithHash } from '../crypto/ops'
import { sealEnvelope, openEnvelope } from '../crypto/envelope'
import { sodium } from '../crypto/sodium'

export interface RecordOpPayload {
  /** Logical store name (its localStorage key, e.g. `arkive_insurance_v1`). */
  store: string
  /** The record's identifier field name (e.g. `policyId`). */
  idKey: string
  action: 'put' | 'delete'
  id: string
  /** Full record for `put`; omitted for `delete`. */
  record?: unknown
}

export function encodeRecordPayload(p: RecordOpPayload): Uint8Array {
  return sodium.from_string(JSON.stringify(p))
}

export function decodeRecordPayload(bytes: Uint8Array): RecordOpPayload {
  return JSON.parse(sodium.to_string(bytes)) as RecordOpPayload
}

export interface BuildRecordOpParams {
  scopeKeyBytes: Uint8Array
  signingSecretKey: Uint8Array
  authorDeviceId: string
  keyEpoch: number
  prevHash: string
  lamportClock: number
  payload: RecordOpPayload
}

/** Build a signed, hash-chained op carrying an encrypted record change. */
export function buildRecordOp(params: BuildRecordOpParams): OpWithHash {
  return createOp(
    {
      scope: 'family',
      keyEpoch: params.keyEpoch,
      prevHash: params.prevHash,
      lamportClock: params.lamportClock,
      authorDeviceId: params.authorDeviceId,
      signingSecretKey: params.signingSecretKey,
      plaintextPayload: encodeRecordPayload(params.payload),
      scopeKeyBytes: params.scopeKeyBytes,
    },
    sealEnvelope,
  )
}

/** Decrypt a record op's payload with the family scope key. */
export function readRecordOp(op: Op, scopeKeyBytes: Uint8Array): RecordOpPayload {
  const bytes = openEnvelope(scopeKeyBytes, sodium.from_base64(op.encrypted_payload))
  return decodeRecordPayload(bytes)
}
