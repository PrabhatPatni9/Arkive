import { lookupEntitlement } from '../sync/relayClient'
import { saveEntitlement, type RelayEntitlement } from './subscription'
import type { SyncTierId } from './plans'

function mapTier(tier: string): SyncTierId {
  if (tier === 'managed_relay' || tier === 'self_hosted') return tier as SyncTierId
  return 'local_lan'
}

export async function refreshEntitlementFromRelay(
  relayUrl: string,
  token: string
): Promise<RelayEntitlement | null> {
  try {
    const result = await lookupEntitlement(relayUrl, token)
    const ent: RelayEntitlement = {
      syncTierId: mapTier(result.tier),
      validUntil: result.validUntil ?? null,
      paymentId: null,
      activatedAt: null,
    }
    saveEntitlement(ent)
    return ent
  } catch {
    return null
  }
}
