/**
 * The runtime bridge that connects the record stores to the op log + sync engine.
 *
 * - `persistSynced` is called by every synced store's save path: it writes the encrypted local
 *   view AND emits a record op for each individual change (put/delete), so other devices receive it.
 * - `materializeOp` is called by the puller for every verified incoming op: it decrypts the record
 *   payload and applies it to the local view, so pulled data shows up in the stores.
 *
 * When sync is not configured (single device, or no relay/family yet) this is inert — stores still
 * persist locally, they just don't emit. The materialise path uses the RAW `saveArray` (never
 * `persistSynced`), so applying a received op can never emit a new op (no feedback loop).
 */
import { GENESIS_HASH } from '../crypto/ops'
import type { Op, OpWithHash } from '../crypto/ops'
import type { OpLogStore } from '../db/opLog'
import { buildRecordOp, readRecordOp } from './recordOps'
import type { RecordOpPayload } from './recordOps'
import { loadArray, saveArray } from '../modules/secureModuleStore'

interface SyncContext {
  opLog: OpLogStore
  scopeKeyBytes: Uint8Array
  signingSecretKey: Uint8Array
  deviceId: string
  keyEpoch: number
  onOp?: (op: OpWithHash) => void   // hand the new op to the engine for pushing
}

let ctx: SyncContext | null = null
// Serialise emits so each reads the previous op's hash/clock — keeps the chain strictly linear.
let emitChain: Promise<void> = Promise.resolve()

export function initSyncContext(c: SyncContext): void { ctx = c }
export function clearSyncContext(): void { ctx = null }
export function isSyncActive(): boolean { return ctx !== null }

/** Resolves once all queued emits have been appended + handed to the engine (for tests/flush). */
export function whenEmitsSettled(): Promise<void> { return emitChain }

/**
 * Persist a store's record array (encrypted) AND emit an op for each changed/added/removed record.
 * `idKey` is the record's identifier field. Used by synced stores in place of `saveArray`.
 */
export function persistSynced<T>(key: string, items: T[], idKey: string): void {
  const before = loadArray<Record<string, unknown>>(key)
  const after = items as unknown as Record<string, unknown>[]
  saveArray(key, after)   // raw local persist (encrypted at rest)
  if (!ctx) return

  const beforeById = new Map(before.map(r => [String(r[idKey]), r]))
  const afterIds = new Set(after.map(r => String(r[idKey])))
  for (const rec of after) {
    const id = String(rec[idKey])
    const prev = beforeById.get(id)
    if (!prev || JSON.stringify(prev) !== JSON.stringify(rec)) {
      emitRecord(key, idKey, 'put', id, rec)
    }
  }
  for (const rec of before) {
    const id = String(rec[idKey])
    if (!afterIds.has(id)) emitRecord(key, idKey, 'delete', id)
  }
}

function emitRecord(store: string, idKey: string, action: 'put' | 'delete', id: string, record?: unknown): void {
  const c = ctx
  if (!c) return
  emitChain = emitChain
    .then(async () => {
      const head = await c.opLog.getHead('family')
      const prevHash = head?.hash ?? GENESIS_HASH
      const lamportClock = (head?.lamport_clock ?? 0) + 1
      const op = buildRecordOp({
        scopeKeyBytes: c.scopeKeyBytes,
        signingSecretKey: c.signingSecretKey,
        authorDeviceId: c.deviceId,
        keyEpoch: c.keyEpoch,
        prevHash,
        lamportClock,
        payload: { store, idKey, action, id, record },
      })
      await c.opLog.append(op)
      c.onOp?.(op)
    })
    .catch(() => { /* never break the local write path */ })
}

/** Apply a verified incoming op to the local view. No-op if inactive or not a record op. */
export function materializeOp(op: Op): void {
  if (!ctx) return
  let payload: RecordOpPayload
  try {
    payload = readRecordOp(op, ctx.scopeKeyBytes)
  } catch {
    return   // not a record op we can read (or wrong key)
  }
  applyRecordPayload(payload)
}

/** Apply one record change to the raw local store (never emits — avoids a feedback loop). */
export function applyRecordPayload(p: RecordOpPayload): void {
  const arr = loadArray<Record<string, unknown>>(p.store)
  const idx = arr.findIndex(r => String(r[p.idKey]) === p.id)
  if (p.action === 'delete') {
    if (idx >= 0) {
      arr.splice(idx, 1)
      saveArray(p.store, arr)
    }
    return
  }
  if (p.record) {
    if (idx >= 0) arr[idx] = p.record as Record<string, unknown>
    else arr.push(p.record as Record<string, unknown>)
    saveArray(p.store, arr)
  }
}
