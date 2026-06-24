export type PlanId = 'free' | 'family' | 'premium'

export interface Plan {
  id: PlanId
  name: string
  priceInr: number          // monthly, 0 for free
  maxMembers: number
  storageLimitGb: number
  ocrEnabled: boolean
  financialDashboard: boolean
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceInr: 0,
    maxMembers: 1,
    storageLimitGb: 0.5,
    ocrEnabled: false,
    financialDashboard: false,
  },
  family: {
    id: 'family',
    name: 'Family',
    priceInr: 199,
    maxMembers: 6,
    storageLimitGb: 5,
    ocrEnabled: true,
    financialDashboard: false,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceInr: 499,
    maxMembers: 20,
    storageLimitGb: 50,
    ocrEnabled: true,
    financialDashboard: true,
  },
}
