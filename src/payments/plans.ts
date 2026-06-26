export type SyncTierId = 'local_lan' | 'managed_relay' | 'self_hosted'

export interface SyncTier {
  id: SyncTierId
  name: string
  priceInrPerYear: number
  tagline: string
  features: string[]
  managed: boolean
}

export const SYNC_TIERS: Record<SyncTierId, SyncTier> = {
  local_lan: {
    id: 'local_lan',
    name: 'Local & LAN',
    priceInrPerYear: 0,
    tagline: 'All features, no server needed',
    features: [
      'Unlimited family members',
      'On-device OCR scanning',
      'All document types',
      'Full offline access',
      'Same-network sync via Wi-Fi',
    ],
    managed: false,
  },
  managed_relay: {
    id: 'managed_relay',
    name: 'Managed Relay',
    priceInrPerYear: 99,
    tagline: 'Free year one, then ₹99/year',
    features: [
      'Everything in Local & LAN',
      'Internet sync across any network',
      'Encrypted relay — Arkive cannot read your data',
      'Background sync & push wake',
      'Billing is web-only (no in-app purchase)',
    ],
    managed: true,
  },
  self_hosted: {
    id: 'self_hosted',
    name: 'Self-Hosted',
    priceInrPerYear: 0,
    tagline: 'Deploy your own relay. Free forever.',
    features: [
      'Everything in Local & LAN',
      'Point the app at your own Cloudflare Worker',
      'One-click "Deploy to Cloudflare" setup',
      '10 GB R2 free tier covers most families',
    ],
    managed: false,
  },
}
