import type { Owner, SharingTier } from '../owners/types'

/**
 * Asset model (brief v2 §5). An Asset is any owned thing worth tracking — a car, a house, a
 * factory, an appliance — that can be insured and that belongs to an Owner (a Person or an
 * Entity). Insurance policies can reference an Asset via coveredAssetId.
 *
 * This generalises the existing vehicles / home-devices modules; those screens remain for now,
 * and can be folded into this model later without disrupting their data.
 */
export type AssetType =
  | 'vehicle'
  | 'real_estate'
  | 'factory_plant'
  | 'appliance'
  | 'equipment'
  | 'valuables'
  | 'other'

export interface Asset {
  assetId: string
  familyId: string
  assetType: AssetType
  name: string
  /** Who owns it — a family member (Person) or an Entity (HUF, company, …). */
  owner: Owner
  /** Free-form identifier (registration no., serial, survey no., IMEI, …). Sensitive PII. */
  identifier?: string
  purchaseDate?: string  // YYYY-MM-DD
  value?: number
  location?: string
  warrantyExpiry?: string // YYYY-MM-DD
  /** Insurance policies covering this asset. */
  linkedPolicyIds?: string[]
  /** Sharing tier, seeded from the owner's default (Entity tier, or 'self' for a Person). */
  sharingTier?: SharingTier
  createdAt: string
  updatedAt: string
}

export type AssetInput = Omit<Asset, 'assetId' | 'createdAt' | 'updatedAt'>

export const ASSET_TYPES: AssetType[] = [
  'vehicle', 'real_estate', 'factory_plant', 'appliance', 'equipment', 'valuables', 'other',
]

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  vehicle:       'Vehicle',
  real_estate:   'Real estate',
  factory_plant: 'Factory / Plant',
  appliance:     'Appliance',
  equipment:     'Equipment',
  valuables:     'Valuables',
  other:         'Other',
}
