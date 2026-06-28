import { registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

export interface NsdService {
  name: string    // encodes the deviceId of the peer
  host: string    // LAN IP address
  port: number    // signaling port (always 47823 for Arkive)
}

export interface NsdPlugin {
  /** Advertise this device on the LAN as _arkive._tcp */
  register(options: { deviceId: string; port: number }): Promise<void>
  /** Start listening for other Arkive devices on LAN */
  startDiscovery(): Promise<void>
  /** Stop all NSD activity */
  stop(): Promise<void>

  addListener(event: 'serviceFound' | 'serviceLost', handler: (service: NsdService) => void): Promise<PluginListenerHandle>
}

export const NSD = registerPlugin<NsdPlugin>('ArkiveNsd', {
  web: {
    // Browser/PWA stub: no-ops — LAN discovery via relay presence fallback
    async register() { /* no-op */ },
    async startDiscovery() { /* no-op */ },
    async stop() { /* no-op */ },
    async addListener() {
      return { remove: async () => { /* no-op */ } }
    },
  },
})
