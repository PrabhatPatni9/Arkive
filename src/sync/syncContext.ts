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
  scopeKeyBytes: Uint8Array          // CURRENT-epoch family key, used to encrypt new ops
  keyEpoch: number                   // CURRENT epoch
  /** Resolve the key for any epoch, so ops from before a rotation still decrypt. */
  keyForEpoch: (epoch: number) => Uint8Array | null
  signingSecretKey: Uint8Array
  deviceId: string
  onOp?: (op: OpWithHash) => void   // hand the new op to the engine for pushing
}

let ctx: SyncContext | null = null
// Serialise emits so each reads the previous op's hash/clock — keeps the chain strictly linear.
let emitChain: Promise<void> = Promise.resolve()

export function initSyncContext(c: SyncContext): void { ctx = c }
export function clearSyncContext(): void { ctx = null }

/** After a key rotation, point new emits at the new current-epoch key. */
export function updateCurrentKey(scopeKeyBytes: Uint8Array, keyEpoch: number): void {
  if (ctx) { ctx.scopeKeyBytes = scopeKeyBytes; ctx.keyEpoch = keyEpoch }
}

// Stores whose incoming changes must be reconciled by a human instead of silently overwritten
// (HC §3 — medical fields). The recorder logs the conflict; the local value is kept until resolved.
const reconcileStores = new Set<string>()
let conflictRecorder: ((store: string, idKey: string, id: string, local: unknown, incoming: unknown) => void) | null = null

export function registerReconcileStore(
  storeKey: string,
  recorder: (store: string, idKey: string, id: string, local: unknown, incoming: unknown) => void,
): void {
  reconcileStores.add(storeKey)
  conflictRecorder = recorder
}

// Custom materialise handlers for stores that aren't a plain localStorage array (e.g. family
// members live inside FamilyState). A registered handler fully owns applying that store's ops and
// receives the signed op too, so it can authorise the change (e.g. only an admin may remove a
// member or rotate the family key).
export type StoreHandler = (payload: RecordOpPayload, op: Op) => void
const storeHandlers = new Map<string, StoreHandler>()

export function registerStoreHandler(storeKey: string, apply: StoreHandler): void {
  storeHandlers.set(storeKey, apply)
}

/** Emit a record op directly (for callers that manage their own storage, e.g. family profiles). */
export function emitRecordDirect(store: string, idKey: string, action: 'put' | 'delete', id: string, record?: unknown): void {
  emitRecord(store, idKey, action, id, record)
}

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
  // Snapshot the encrypting key/epoch NOW, so an op queued just before a rotation is still sealed
  // with the key it was authored under (avoids a race with updateCurrentKey).
  const scopeKeyBytes = c.scopeKeyBytes
  const keyEpoch = c.keyEpoch
  emitChain = emitChain
    .then(async () => {
      const head = await c.opLog.getHead('family')
      const prevHash = head?.hash ?? GENESIS_HASH
      const lamportClock = (head?.lamport_clock ?? 0) + 1
      const op = buildRecordOp({
        scopeKeyBytes,
        signingSecretKey: c.signingSecretKey,
        authorDeviceId: c.deviceId,
        keyEpoch,
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
  // Decrypt with the key for the op's epoch (ops authored before a rotation use an older key).
  const key = ctx.keyForEpoch(op.key_epoch) ?? ctx.scopeKeyBytes
  let payload: RecordOpPayload
  try {
    payload = readRecordOp(op, key)
  } catch {
    return   // not a record op we can read (or no key for that epoch)
  }
  applyRecordPayload(payload, op)
}

/** Apply one record change to the raw local store (never emits — avoids a feedback loop). */
function applyRecordPayload(p: RecordOpPayload, op?: Op): void {
  // Stores with a custom handler (e.g. family members / keys) own their own apply logic and get
  // the op for authorisation. Only reachable with an op from materializeOp; the default array
  // path below needs no op.
  const custom = storeHandlers.get(p.store)
  if (custom && op) { custom(p, op); return }

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
    // HC §3: for reconcile stores (medical), never silently overwrite a differing local record —
    // record a conflict and keep the local value until a human chooses.
    if (idx >= 0 && reconcileStores.has(p.store)) {
      const local = arr[idx]
      if (JSON.stringify(local) !== JSON.stringify(p.record)) {
        conflictRecorder?.(p.store, p.idKey, p.id, local, p.record)
        return
      }
    }
    if (idx >= 0) arr[idx] = p.record as Record<string, unknown>
    else arr.push(p.record as Record<string, unknown>)
    saveArray(p.store, arr)
  }
}
