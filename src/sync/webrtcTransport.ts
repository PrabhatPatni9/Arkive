import { postSignal, pollSignals, ackSignal, type SignalMessage } from './signalClient'

export interface SyncPacket {
  type: 'ops' | 'pull_request' | 'ack'
  ops?: unknown[]
  since?: number
}

export interface WebRTCTransportConfig {
  relayUrl: string
  token: string
  deviceId: string
  onPacket: (packet: SyncPacket, peerId: string) => void
  onStateChange?: (peerId: string, state: RTCPeerConnectionState) => void
}

// Public STUN servers — for NAT traversal on Internet P2P
// Local ICE candidates are tried first, so LAN peers connect directly
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

class PeerConnection {
  private pc: RTCPeerConnection
  private channel: RTCDataChannel | null = null
  readonly peerId: string
  private onPacket: (packet: SyncPacket, peerId: string) => void
  private onStateChange?: (peerId: string, state: RTCPeerConnectionState) => void

  constructor(
    peerId: string,
    onPacket: (packet: SyncPacket, peerId: string) => void,
    onStateChange?: (peerId: string, state: RTCPeerConnectionState) => void
  ) {
    this.peerId = peerId
    this.onPacket = onPacket
    this.onStateChange = onStateChange
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    this.pc.onconnectionstatechange = () => {
      this.onStateChange?.(peerId, this.pc.connectionState)
    }

    this.pc.ondatachannel = event => {
      this.attachChannel(event.channel)
    }
  }

  private attachChannel(ch: RTCDataChannel): void {
    this.channel = ch
    ch.binaryType = 'arraybuffer'
    ch.onmessage = event => {
      try {
        const packet = JSON.parse(event.data as string) as SyncPacket
        this.onPacket(packet, this.peerId)
      } catch { /* ignore malformed */ }
    }
  }

  async createOffer(onIce: (candidate: RTCIceCandidate) => void): Promise<RTCSessionDescriptionInit> {
    const ch = this.pc.createDataChannel('sync', { ordered: true })
    this.attachChannel(ch)

    this.pc.onicecandidate = event => {
      if (event.candidate) onIce(event.candidate)
    }

    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    return offer
  }

  async handleOffer(
    offer: RTCSessionDescriptionInit,
    onIce: (candidate: RTCIceCandidate) => void
  ): Promise<RTCSessionDescriptionInit> {
    this.pc.onicecandidate = event => {
      if (event.candidate) onIce(event.candidate)
    }
    await this.pc.setRemoteDescription(offer)
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    return answer
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(answer)
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.pc.addIceCandidate(candidate)
    } catch { /* ignore stale candidates */ }
  }

  send(packet: SyncPacket): boolean {
    if (!this.channel || this.channel.readyState !== 'open') return false
    try {
      this.channel.send(JSON.stringify(packet))
      return true
    } catch { return false }
  }

  isConnected(): boolean {
    return this.pc.connectionState === 'connected'
  }

  close(): void {
    this.channel?.close()
    this.pc.close()
  }
}

export class WebRTCTransport {
  private peers = new Map<string, PeerConnection>()
  private pollInterval: ReturnType<typeof setInterval> | null = null

  constructor(private config: WebRTCTransportConfig) {}

  start(pollMs = 2000): void {
    this.pollInterval = setInterval(() => void this.pollSignals(), pollMs)
    void this.pollSignals()
  }

  stop(): void {
    if (this.pollInterval) clearInterval(this.pollInterval)
    this.pollInterval = null
    this.peers.forEach(p => p.close())
    this.peers.clear()
  }

  // Initiate connection to a peer (caller side)
  async connect(peerId: string): Promise<boolean> {
    if (this.peers.get(peerId)?.isConnected()) return true

    const peer = this.getOrCreatePeer(peerId)

    const iceBuf: RTCIceCandidate[] = []
    const offer = await peer.createOffer(ice => iceBuf.push(ice))

    await postSignal(
      this.config.relayUrl, this.config.token,
      peerId, 'offer', JSON.stringify(offer)
    )

    // Send buffered ICE candidates after a brief delay (allow SDP exchange)
    setTimeout(() => {
      for (const ice of iceBuf) {
        void postSignal(
          this.config.relayUrl, this.config.token,
          peerId, 'ice', JSON.stringify(ice.toJSON())
        )
      }
    }, 500)

    // Wait up to 8s for connection
    return new Promise(resolve => {
      const timeout = setTimeout(() => resolve(false), 8000)
      const check = setInterval(() => {
        if (peer.isConnected()) {
          clearTimeout(timeout)
          clearInterval(check)
          resolve(true)
        }
      }, 200)
    })
  }

  // Send a sync packet to a connected peer
  send(peerId: string, packet: SyncPacket): boolean {
    return this.peers.get(peerId)?.send(packet) ?? false
  }

  // Returns device IDs of currently connected peers
  connectedPeers(): string[] {
    return Array.from(this.peers.entries())
      .filter(([, p]) => p.isConnected())
      .map(([id]) => id)
  }

  private getOrCreatePeer(peerId: string): PeerConnection {
    const existing = this.peers.get(peerId)
    if (existing && !['failed', 'closed', 'disconnected'].includes(
      existing.isConnected() ? 'connected' : 'pending'
    )) {
      return existing
    }
    existing?.close()
    const peer = new PeerConnection(peerId, this.config.onPacket, this.config.onStateChange)
    this.peers.set(peerId, peer)
    return peer
  }

  private async pollSignals(): Promise<void> {
    try {
      const signals = await pollSignals(this.config.relayUrl, this.config.token)
      for (const sig of signals) {
        await this.handleSignal(sig)
        await ackSignal(this.config.relayUrl, this.config.token, sig.id)
      }
    } catch { /* network errors are fine; retry on next poll */ }
  }

  private async handleSignal(sig: SignalMessage): Promise<void> {
    // Skip our own presence broadcasts
    if (sig.type === 'presence') return

    const peerId = sig.sender_id
    const peer = this.getOrCreatePeer(peerId)
    const iceBuf: RTCIceCandidate[] = []

    if (sig.type === 'offer') {
      const offer = JSON.parse(sig.payload) as RTCSessionDescriptionInit
      const answer = await peer.handleOffer(offer, ice => iceBuf.push(ice))

      await postSignal(
        this.config.relayUrl, this.config.token,
        peerId, 'answer', JSON.stringify(answer)
      )

      setTimeout(() => {
        for (const ice of iceBuf) {
          void postSignal(
            this.config.relayUrl, this.config.token,
            peerId, 'ice', JSON.stringify(ice.toJSON())
          )
        }
      }, 500)
    } else if (sig.type === 'answer') {
      const answer = JSON.parse(sig.payload) as RTCSessionDescriptionInit
      await peer.handleAnswer(answer)
    } else if (sig.type === 'ice') {
      const candidate = JSON.parse(sig.payload) as RTCIceCandidateInit
      await peer.addIceCandidate(candidate)
    }
  }
}
