import type { Owner, SharingTier } from '../owners/types'

// Canonical policy types (brief v2 §5). 'vehicle' and 'home' are kept as legacy aliases so
// policies created before this expansion still validate and display; new policies use the
// canonical 'motor' / 'property'.
export type PolicyType =
  | 'health'
  | 'life'
  | 'motor'
  | 'property'
  | 'asset'
  | 'business'
  | 'travel'
  | 'other'
  | 'vehicle'   // legacy alias of motor
  | 'home'      // legacy alias of property

export type PremiumCycle = 'monthly' | 'quarterly' | 'yearly'

export interface InsurancePolicy {
  policyId: string
  familyId: string
  /**
   * Legacy required field: the member this policy was filed under. Retained for backward
   * compatibility. New policies also set `policyholder` (which may be a Person or an Entity).
   */
  memberId: string
  policyType: PolicyType
  insurer: string
  policyNumber: string
  sumInsured: number
  premium: number
  premiumCycle: PremiumCycle
  startDate: string    // YYYY-MM-DD
  expiryDate: string   // YYYY-MM-DD
  notes?: string

  // ── Owner model (brief v2 §5) — all optional so existing records keep working ──
  /** Who holds the policy — a family member (Person) or an Entity (HUF, Pvt Ltd, …). */
  policyholder?: Owner
  /** People actually covered by the policy (may differ from the holder). */
  insuredMemberIds?: string[]
  /** Nominee(s) / beneficiary members. */
  beneficiaryMemberIds?: string[]
  /** Linked asset for motor/property/asset/business cover. */
  coveredAssetId?: string
  /** Sharing tier, seeded from the policyholder's default (Entity tier, or 'self' for a Person). */
  sharingTier?: SharingTier

  createdAt: string
  updatedAt: string
}

export type PolicyInput = Omit<InsurancePolicy, 'policyId' | 'createdAt' | 'updatedAt'>

/** Canonical policy types offered in the UI (legacy aliases are display-only). */
export const POLICY_TYPES: PolicyType[] = [
  'health', 'life', 'motor', 'property', 'asset', 'business', 'travel', 'other',
]

/** Human labels, including the legacy aliases so old records still render nicely. */
export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  health:   'Health',
  life:     'Life',
  motor:    'Motor',
  property: 'Property',
  asset:    'Asset',
  business: 'Business / Liability',
  travel:   'Travel',
  other:    'Other',
  vehicle:  'Motor',      // legacy
  home:     'Property',   // legacy
}
