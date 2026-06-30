import { pullFromRelay, type PullResult } from './puller'
import { pushToRelay } from './pusher'
import { WebRTCTransport, type SyncPacket } from './webrtcTransport'
import { LanDiscovery } from './lanDiscovery'
import { prefetchOnWifi } from './prefetch'
import { postSignal } from './signalClient'
import { isOnWifi, onNetworkChange } from './network'
import type { OpLogStore } from '../db/opLog'
import type { OpWithHash } from '../crypto/ops'

export interface SyncConfig {
  relayUrl: string
  familyId: string
  deviceId: string
  deviceToken?: string
  signingKeys: Map<string, Uint8Array>  // device_id → Ed25519 public key
  intervalMs: number
  enableP2P?: boolean  // default true when relayUrl + deviceToken present
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

  private webrtc: WebRTCTransport | null = null
  private lan: LanDiscovery | null = null
  private networkCleanup: (() => void) | null = null

  constructor(
    private config: SyncConfig,
    private opLog: OpLogStore
  ) {}

  enqueuePush(op: OpWithHash): void {
    this.pending.push({ op, pushed: false })
    // When P2P peers are connected, push immediately without waiting for interval
    if (this.webrtc) {
      const connected = this.webrtc.connectedPeers()
      for (const peerId of connected) {
        this.webrtc.send(peerId, { type: 'ops', ops: [op] })
      }
    }
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.initP2P()
    this.schedule(0)
  }

  stop(): void {
    this.running = false
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.webrtc?.stop()
    this.webrtc = null
    void this.lan?.stop()
    this.lan = null
    this.networkCleanup?.()
    this.networkCleanup = null
  }

  async syncNow(): Promise<PullResult> {
    return this.runSync()
  }

  private initP2P(): void {
    const { relayUrl, deviceToken, deviceId, enableP2P } = this.config
    if (!relayUrl || !deviceToken || enableP2P === false) return

    // WebRTC transport — handles both Internet P2P and same-LAN peers
    this.webrtc = new WebRTCTransport({
      relayUrl,
      token: deviceToken,
      deviceId,
      onPacket: (packet, peerId) => void this.handleP2PPacket(packet, peerId),
    })
    this.webrtc.start(3000)

    // LAN discovery
    this.lan = new LanDiscovery()
    this.lan.onPeerFound(peer => void this.onLanPeerFound(peer.deviceId))
    void this.lan.start(deviceId, relayUrl, deviceToken)

    // Post presence when on WiFi; re-trigger on network change
    void this.maybePostPresence()
    this.networkCleanup = onNetworkChange((type) => {
      if (type === 'wifi') void this.maybePostPresence()
    })
  }

  private async maybePostPresence(): Promise<void> {
    const { relayUrl, deviceToken, deviceId } = this.config
    if (!relayUrl || !deviceToken) return
    const wifi = await isOnWifi()
    if (!wifi) return
    try {
      // Presence: broadcast to a sentinel recipient the relay knows to fan out
      await postSignal(relayUrl, deviceToken, `__presence__${deviceId}`, 'presence', JSON.stringify({ deviceId }))
    } catch { /* best-effort */ }
  }

  private async onLanPeerFound(peerId: string): Promise<void> {
    if (!this.webrtc || !this.running) return
    // Initiate WebRTC connection — ICE will find local path for LAN peers automatically
    const connected = await this.webrtc.connect(peerId)
    if (connected) {
      // Immediately request their ops
      this.webrtc.send(peerId, { type: 'pull_request', since: this.lastLamport })
    }
  }

  private async handleP2PPacket(packet: SyncPacket, peerId: string): Promise<void> {
    void peerId
    if (packet.type === 'ops' && packet.ops) {
      // SECURITY INVARIANT: ops arriving over P2P are NOT applied here. A LAN peer is
      // an untrusted source — never apply an op without verifying its Ed25519 signature
      // and hash-chain link first (the relay's verification does not transfer to P2P).
      // P2P op ingestion is intentionally unimplemented for v1; the relay pull path in
      // puller.ts (verifyOp + verifyChainLink) is the only path that applies ops. If this
      // is ever implemented, it MUST run the same verification before applying.
    }
    if (packet.type === 'pull_request' && packet.since !== undefined) {
      // Peer is asking us for our ops — send what we have since their cursor
      const ops = this.pending.filter(p => p.op.lamport_clock > (packet.since ?? 0)).map(p => p.op)
      if (ops.length > 0 && this.webrtc) {
        this.webrtc.send(peerId, { type: 'ops', ops })
      }
    }
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
    void this.maybePrefetch()
    return result
  }

  private async doPull(): Promise<PullResult> {
    try {
      const result = await pullFromRelay(
        this.config.relayUrl,
        this.config.familyId,
        this.lastLamport,
        this.config.signingKeys,
        this.opLog,
        this.config.deviceToken
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

    // Try P2P first: if all connected peers get the ops, skip relay push
    let sentViaP2P = false
    if (this.webrtc) {
      const connected = this.webrtc.connectedPeers()
      if (connected.length > 0) {
        for (const peerId of connected) {
          this.webrtc.send(peerId, { type: 'ops', ops: unpushed.map(p => p.op) })
        }
        // Still push to relay for persistence and to reach offline devices
        sentViaP2P = true
      }
    }
    void sentViaP2P  // relay push always happens for durability

    try {
      await pushToRelay(
        this.config.relayUrl,
        this.config.familyId,
        unpushed.map(p => p.op),
        this.config.deviceToken
      )
      unpushed.forEach(p => { p.pushed = true })
    } catch {
      // Retry on next interval
    }
  }

  private async maybePrefetch(): Promise<void> {
    const { relayUrl, deviceToken } = this.config
    if (!relayUrl || !deviceToken) return
    try {
      await prefetchOnWifi(relayUrl, deviceToken)
    } catch { /* prefetch is best-effort */ }
  }
}
