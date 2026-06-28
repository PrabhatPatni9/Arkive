import { NSD, type NsdService } from '../plugins/nsd'
import { getOnlineDevices } from './signalClient'
import { isOnWifi } from './network'

const NSD_PORT = 47823
const NSD_SERVICE_TYPE = '_arkive._tcp'
void NSD_SERVICE_TYPE  // used in Android NsdPlugin; reference here for documentation

export interface LanPeer {
  deviceId: string
  /** Populated by NSD when available, undefined when using relay-presence fallback */
  host?: string
  port?: number
  via: 'nsd' | 'relay'
}

export class LanDiscovery {
  private nsdAvailable = false
  private knownPeers = new Map<string, LanPeer>()
  private listeners: Array<(peer: LanPeer) => void> = []
  private nsdHandles: Array<{ remove: () => Promise<void> }> = []

  async start(deviceId: string, relayUrl?: string, token?: string): Promise<void> {
    // Try native NSD first
    try {
      await NSD.register({ deviceId, port: NSD_PORT })
      await NSD.startDiscovery()
      this.nsdAvailable = true

      const foundHandle = await NSD.addListener('serviceFound', (service: NsdService) => {
        const peer: LanPeer = {
          deviceId: service.name,
          host: service.host,
          port: service.port,
          via: 'nsd',
        }
        this.knownPeers.set(service.name, peer)
        this.emit(peer)
      })

      const lostHandle = await NSD.addListener('serviceLost', (service: NsdService) => {
        this.knownPeers.delete(service.name)
      })

      this.nsdHandles.push(foundHandle, lostHandle)
    } catch {
      // NSD not available (PWA, emulator, or AP isolation)
      this.nsdAvailable = false
    }

    // Relay-presence fallback: announce ourselves and discover peers via relay
    if (!this.nsdAvailable && relayUrl && token) {
      await this.discoverViaRelayPresence(relayUrl, token, deviceId)
    }
  }

  async discoverViaRelayPresence(
    relayUrl: string,
    token: string,
    myDeviceId: string
  ): Promise<void> {
    const wifi = await isOnWifi()
    if (!wifi) return

    try {
      const online = await getOnlineDevices(relayUrl, token)
      for (const entry of online) {
        if (entry.deviceId === myDeviceId) continue
        const peer: LanPeer = {
          deviceId: entry.deviceId,
          via: 'relay',
        }
        if (!this.knownPeers.has(entry.deviceId)) {
          this.knownPeers.set(entry.deviceId, peer)
          this.emit(peer)
        }
      }
    } catch { /* relay presence is best-effort */ }
  }

  onPeerFound(cb: (peer: LanPeer) => void): void {
    this.listeners.push(cb)
  }

  getPeers(): LanPeer[] {
    return Array.from(this.knownPeers.values())
  }

  async stop(): Promise<void> {
    for (const h of this.nsdHandles) await h.remove()
    this.nsdHandles = []
    this.knownPeers.clear()
    try { await NSD.stop() } catch { /* ignore */ }
  }

  private emit(peer: LanPeer): void {
    this.listeners.forEach(l => l(peer))
  }
}
