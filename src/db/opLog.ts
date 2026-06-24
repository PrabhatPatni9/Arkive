import type { OpWithHash } from '../crypto/ops'

export interface OpLogStore {
  append(op: OpWithHash): Promise<void>
  getHead(scope: string): Promise<OpWithHash | null>
  getSince(scope: string, lamportClock: number): Promise<OpWithHash[]>
  getByHash(hash: string): Promise<OpWithHash | null>
}

export class MemoryOpLog implements OpLogStore {
  private ops: OpWithHash[] = []

  async append(op: OpWithHash): Promise<void> {
    if (this.ops.some(o => o.hash === op.hash)) {
      throw new Error(`Duplicate op hash: ${op.hash}`)
    }
    this.ops.push(op)
  }

  async getHead(scope: string): Promise<OpWithHash | null> {
    const scoped = this.ops.filter(o => o.scope === scope)
    if (scoped.length === 0) return null
    return scoped.reduce((max, o) =>
      o.lamport_clock > max.lamport_clock ? o : max
    )
  }

  async getSince(scope: string, lamportClock: number): Promise<OpWithHash[]> {
    return this.ops
      .filter(o => o.scope === scope && o.lamport_clock >= lamportClock)
      .sort((a, b) => a.lamport_clock - b.lamport_clock)
  }

  async getByHash(hash: string): Promise<OpWithHash | null> {
    return this.ops.find(o => o.hash === hash) ?? null
  }

  clear(): void {
    this.ops = []
  }
}
