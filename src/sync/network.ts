import { Network } from '@capacitor/network'

export type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown'

export async function getConnectionType(): Promise<ConnectionType> {
  try {
    const status = await Network.getStatus()
    return status.connectionType as ConnectionType
  } catch {
    // PWA / test environment where plugin is absent
    return navigator.onLine ? 'unknown' : 'none'
  }
}

export async function isOnWifi(): Promise<boolean> {
  return (await getConnectionType()) === 'wifi'
}

export function onNetworkChange(
  cb: (type: ConnectionType, connected: boolean) => void
): () => void {
  const handle = Network.addListener('networkStatusChange', status => {
    cb(status.connectionType as ConnectionType, status.connected)
  }).catch(() => null)

  return () => {
    void handle.then(h => h?.remove())
  }
}
