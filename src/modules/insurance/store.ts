import type { InsurancePolicy, PolicyInput } from './types'
import { loadArray } from '../secureModuleStore'
import { persistSynced } from '../../sync/syncContext'

const KEY = 'arkive_insurance_v1'

function randomId(): string { return Math.random().toString(36).slice(2, 18) }

function loadAll(): InsurancePolicy[] {
  return loadArray<InsurancePolicy>(KEY)
}

function saveAll(policies: InsurancePolicy[]): void {
  persistSynced(KEY, policies, 'policyId')
}

export function getPolicies(familyId: string): InsurancePolicy[] {
  return loadAll().filter(p => p.familyId === familyId)
}

export function addPolicy(input: PolicyInput): InsurancePolicy {
  const now = new Date().toISOString()
  const policy: InsurancePolicy = { ...input, policyId: randomId(), createdAt: now, updatedAt: now }
  const all = loadAll()
  all.push(policy)
  saveAll(all)
  return policy
}

export function updatePolicy(policyId: string, updates: Partial<PolicyInput>): void {
  const all = loadAll()
  const idx = all.findIndex(p => p.policyId === policyId)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() }
  saveAll(all)
}

export function deletePolicy(policyId: string): void {
  saveAll(loadAll().filter(p => p.policyId !== policyId))
}

export function isPolicyExpiringSoon(policy: InsurancePolicy, withinDays = 30): boolean {
  const expiry = new Date(policy.expiryDate)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()
  return diffMs >= 0 && diffMs <= withinDays * 86_400_000
}
