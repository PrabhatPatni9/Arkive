import { describe, it, expect, beforeAll } from 'vitest'
import { initSodium } from '../crypto/sodium'
import { PLANS } from './plans'
import {
  isSubscriptionActive,
  canAddMember,
  isOcrAllowed,
  isFinancialDashboardAllowed,
} from './subscription'
import type { SubscriptionState } from './subscription'

beforeAll(async () => {
  await initSodium()
})

const future = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
const past = () => new Date(Date.now() - 1000).toISOString()

describe('plans', () => {
  it('free plan has no cost', () => { expect(PLANS.free.priceInr).toBe(0) })
  it('family plan caps at 6 members', () => { expect(PLANS.family.maxMembers).toBe(6) })
  it('premium plan has OCR and financial dashboard', () => {
    expect(PLANS.premium.ocrEnabled).toBe(true)
    expect(PLANS.premium.financialDashboard).toBe(true)
  })
  it('free plan has no OCR', () => { expect(PLANS.free.ocrEnabled).toBe(false) })
})

describe('subscription guards', () => {
  const active = (planId: SubscriptionState['planId']): SubscriptionState => ({
    planId, validUntil: future(), paymentId: 'pay_x', activatedAt: new Date().toISOString(),
  })
  const expired = (planId: SubscriptionState['planId']): SubscriptionState => ({
    planId, validUntil: past(), paymentId: 'pay_x', activatedAt: new Date().toISOString(),
  })

  it('active subscription returns true', () => {
    expect(isSubscriptionActive(active('family'))).toBe(true)
  })

  it('expired subscription returns false', () => {
    expect(isSubscriptionActive(expired('family'))).toBe(false)
  })

  it('canAddMember respects family plan limit of 6', () => {
    expect(canAddMember(active('family'), 5)).toBe(true)
    expect(canAddMember(active('family'), 6)).toBe(false)
  })

  it('canAddMember respects premium plan limit of 20', () => {
    expect(canAddMember(active('premium'), 19)).toBe(true)
    expect(canAddMember(active('premium'), 20)).toBe(false)
  })

  it('isOcrAllowed is false on free plan', () => {
    expect(isOcrAllowed(active('free'))).toBe(false)
  })

  it('isOcrAllowed is true on family plan', () => {
    expect(isOcrAllowed(active('family'))).toBe(true)
  })

  it('isOcrAllowed falls back to free rules on expired subscription', () => {
    expect(isOcrAllowed(expired('premium'))).toBe(false)
  })

  it('isFinancialDashboardAllowed only on active premium', () => {
    expect(isFinancialDashboardAllowed(active('premium'))).toBe(true)
    expect(isFinancialDashboardAllowed(active('family'))).toBe(false)
    expect(isFinancialDashboardAllowed(expired('premium'))).toBe(false)
  })
})
