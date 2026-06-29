export type PolicyType = 'health' | 'life' | 'vehicle' | 'home' | 'other'
export type PremiumCycle = 'monthly' | 'quarterly' | 'yearly'

export interface InsurancePolicy {
  policyId: string
  familyId: string
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
  createdAt: string
  updatedAt: string
}

export type PolicyInput = Omit<InsurancePolicy, 'policyId' | 'createdAt' | 'updatedAt'>
