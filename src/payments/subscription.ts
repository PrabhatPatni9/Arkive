import type { SyncTierId } from './plans'

export interface RelayEntitlement {
  syncTierId: SyncTierId
  validUntil: string | null  // null = free/self-hosted
  paymentId: string | null
  activatedAt: string | null
}

export function defaultEntitlement(): RelayEntitlement {
  return { syncTierId: 'local_lan', validUntil: null, paymentId: null, activatedAt: null }
}

export function isManagedRelayActive(ent: RelayEntitlement): boolean {
  if (ent.syncTierId !== 'managed_relay') return false
  if (!ent.validUntil) return false
  return new Date(ent.validUntil) > new Date()
}

export function getEffectiveSyncTier(ent: RelayEntitlement): SyncTierId {
  if (ent.syncTierId === 'managed_relay' && !isManagedRelayActive(ent)) {
    return 'local_lan'
  }
  return ent.syncTierId
}

const ENTITLEMENT_KEY = 'arkive_entitlement_v1'

export function loadEntitlement(): RelayEntitlement {
  try {
    const raw = localStorage.getItem(ENTITLEMENT_KEY)
    if (raw) return JSON.parse(raw) as RelayEntitlement
  } catch { /* ignore */ }
  return defaultEntitlement()
}

export function saveEntitlement(ent: RelayEntitlement): void {
  localStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(ent))
}
