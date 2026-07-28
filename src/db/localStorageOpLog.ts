import type { OpWithHash } from '../crypto/ops'
import type { OpLogStore } from './opLog'

/**
 * A localStorage-backed op log so the hash chain survives page reloads on web/PWA.
 *
 * Why: with the in-memory `MemoryOpLog`, a reloaded web session starts with an empty log, so a
 * new local edit would emit an op from GENESIS and fork the chain, and pulled ops couldn't be
 * de-duplicated. Persisting the log keeps `getHead` (chain continuity for new emits) and
 * `getByHash` (dedup) correct across reloads. Native Android has the durable SQLite op log; this
 * is the web equivalent, and also works inside the Capacitor WebView.
 *
 * Ops are safe to store here: the payload is already ciphertext (sealed with the family key) and
 * the metadata (hashes, Lamport clock, scope, author device) is exactly what the relay holds too.
 */
const KEY = 'arkive_oplog_v1'

export class LocalStorageOpLog implements OpLogStore {
  private ops: OpWithHash[]

  constructor() {
    this.ops = this.load()
  }

  private load(): OpWithHash[] {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as OpWithHash[]) : []
    } catch {
      return []
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.ops))
    } catch {
      // Storage full — the op still lives in memory for this session; sync remains functional.
    }
  }

  async append(op: OpWithHash): Promise<void> {
    if (this.ops.some(o => o.hash === op.hash)) {
      throw new Error(`Duplicate op hash: ${op.hash}`)
    }
    this.ops.push(op)
    this.persist()
  }

  async getHead(scope: string): Promise<OpWithHash | null> {
    const scoped = this.ops.filter(o => o.scope === scope)
    if (scoped.length === 0) return null
    return scoped.reduce((max, o) => (o.lamport_clock > max.lamport_clock ? o : max))
  }

  async getSince(scope: string, lamportClock: number): Promise<OpWithHash[]> {
    return this.ops
      .filter(o => o.scope === scope && o.lamport_clock >= lamportClock)
      .sort((a, b) => a.lamport_clock - b.lamport_clock)
  }

  async getByHash(hash: string): Promise<OpWithHash | null> {
    return this.ops.find(o => o.hash === hash) ?? null
  }
}
