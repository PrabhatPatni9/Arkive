import { pullFromRelay, type PullResult } from './puller'
import { pushToRelay } from './pusher'
import type { OpLogStore } from '../db/opLog'
import type { OpWithHash } from '../crypto/ops'

export interface SyncConfig {
  relayUrl: string
  familyId: string
  deviceId: string
  signingKeys: Map<string, Uint8Array> // device_id → Ed25519 public key
  intervalMs: number
}

interface PendingOp {
  op: OpWithHash
  pushed: boolean
}

export class SyncEngine {
  private timer: ReturnType<typeof setTimeout> | null = null
  private pending: PendingOp[] = []
  private lastLamport = 0
  private running = false

  constructor(
    private config: SyncConfig,
    private opLog: OpLogStore
  ) {}

  enqueuePush(op: OpWithHash): void {
    this.pending.push({ op, pushed: false })
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.schedule(0)
  }

  stop(): void {
    this.running = false
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  async syncNow(): Promise<PullResult> {
    return this.runSync()
  }

  private schedule(delayMs: number): void {
    this.timer = setTimeout(() => {
      if (!this.running) return
      void this.runSync().finally(() => {
        if (this.running) this.schedule(this.config.intervalMs)
      })
    }, delayMs)
  }

  private async runSync(): Promise<PullResult> {
    const result = await this.doPull()
    await this.doPush()
    return result
  }

  private async doPull(): Promise<PullResult> {
    try {
      const result = await pullFromRelay(
        this.config.relayUrl,
        this.config.familyId,
        this.lastLamport,
        this.config.signingKeys,
        this.opLog
      )
      const head = await this.opLog.getHead(this.config.familyId)
      if (head && head.lamport_clock > this.lastLamport) {
        this.lastLamport = head.lamport_clock
      }
      return result
    } catch {
      return { applied: 0, skipped: 0 }
    }
  }

  private async doPush(): Promise<void> {
    const unpushed = this.pending.filter(p => !p.pushed)
    if (unpushed.length === 0) return
    try {
      await pushToRelay(
        this.config.relayUrl,
        this.config.familyId,
        unpushed.map(p => p.op)
      )
      unpushed.forEach(p => { p.pushed = true })
    } catch {
      // Retry on next interval
    }
  }
}
