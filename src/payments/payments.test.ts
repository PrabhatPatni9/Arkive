import { describe, it, expect } from 'vitest'
import { SYNC_TIERS } from './plans'
import { isManagedRelayActive, getEffectiveSyncTier, defaultEntitlement } from './subscription'
import type { RelayEntitlement } from './subscription'

const future = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
const past = () => new Date(Date.now() - 1000).toISOString()

describe('sync tiers', () => {
  it('all three tiers exist', () => {
    expect(SYNC_TIERS.local_lan).toBeDefined()
    expect(SYNC_TIERS.managed_relay).toBeDefined()
    expect(SYNC_TIERS.self_hosted).toBeDefined()
  })

  it('local_lan and self_hosted are free', () => {
    expect(SYNC_TIERS.local_lan.priceInrPerYear).toBe(0)
    expect(SYNC_TIERS.self_hosted.priceInrPerYear).toBe(0)
  })

  it('managed_relay costs 99 INR per year', () => {
    expect(SYNC_TIERS.managed_relay.priceInrPerYear).toBe(99)
  })

  it('only managed_relay is managed', () => {
    expect(SYNC_TIERS.local_lan.managed).toBe(false)
    expect(SYNC_TIERS.managed_relay.managed).toBe(true)
    expect(SYNC_TIERS.self_hosted.managed).toBe(false)
  })

  it('all tiers have features listed', () => {
    for (const tier of Object.values(SYNC_TIERS)) {
      expect(tier.features.length).toBeGreaterThan(0)
    }
  })
})

describe('relay entitlement', () => {
  const active = (): RelayEntitlement => ({
    syncTierId: 'managed_relay',
    validUntil: future(),
    paymentId: 'pay_x',
    activatedAt: new Date().toISOString(),
  })
  const expired = (): RelayEntitlement => ({
    syncTierId: 'managed_relay',
    validUntil: past(),
    paymentId: 'pay_x',
    activatedAt: new Date().toISOString(),
  })
  const selfHosted = (): RelayEntitlement => ({
    syncTierId: 'self_hosted',
    validUntil: null,
    paymentId: null,
    activatedAt: null,
  })

  it('active managed relay returns true', () => {
    expect(isManagedRelayActive(active())).toBe(true)
  })

  it('expired managed relay returns false', () => {
    expect(isManagedRelayActive(expired())).toBe(false)
  })

  it('default entitlement is not managed relay', () => {
    expect(isManagedRelayActive(defaultEntitlement())).toBe(false)
  })

  it('self_hosted is not managed relay', () => {
    expect(isManagedRelayActive(selfHosted())).toBe(false)
  })

  it('getEffectiveSyncTier returns managed_relay when active', () => {
    expect(getEffectiveSyncTier(active())).toBe('managed_relay')
  })

  it('getEffectiveSyncTier falls back to local_lan on expiry', () => {
    expect(getEffectiveSyncTier(expired())).toBe('local_lan')
  })

  it('getEffectiveSyncTier returns local_lan for default entitlement', () => {
    expect(getEffectiveSyncTier(defaultEntitlement())).toBe('local_lan')
  })

  it('getEffectiveSyncTier returns self_hosted when set', () => {
    expect(getEffectiveSyncTier(selfHosted())).toBe('self_hosted')
  })
})
