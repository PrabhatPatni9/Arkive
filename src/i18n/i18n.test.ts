import { describe, it, expect, beforeEach, vi } from 'vitest'

// localStorage stub
const store: Record<string, string> = {}
/* eslint-disable @typescript-eslint/no-dynamic-delete */
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
} as Storage
/* eslint-enable @typescript-eslint/no-dynamic-delete */

import {
  SUPPORTED_LANGUAGES,
  getStoredLocale,
  saveLocale,
  needsReview,
  REVIEW_REQUIRED_LOCALES,
  REVIEW_REQUIRED_KEYS,
  type SupportedLocale,
} from './config'

beforeEach(() => {
  localStorage.clear()
})

describe('SUPPORTED_LANGUAGES', () => {
  it('contains exactly 15 languages', () => {
    expect(Object.keys(SUPPORTED_LANGUAGES)).toHaveLength(15)
  })

  it('includes all specified locales', () => {
    const required: SupportedLocale[] = ['en','hi','mr','kn','bn','ta','te','gu','es','fr','de','pt','zh','ja','id']
    for (const locale of required) {
      expect(SUPPORTED_LANGUAGES).toHaveProperty(locale)
    }
  })

  it('English is in the list', () => {
    expect(SUPPORTED_LANGUAGES.en).toBe('English')
  })

  it('all LTR languages — no RTL (Arabic, Urdu, Hebrew)', () => {
    const keys = Object.keys(SUPPORTED_LANGUAGES) as SupportedLocale[]
    expect(keys).not.toContain('ar')
    expect(keys).not.toContain('ur')
    expect(keys).not.toContain('he')
  })
})

describe('getStoredLocale', () => {
  it('returns en when nothing is stored', () => {
    expect(getStoredLocale()).toBe('en')
  })

  it('returns stored locale when valid', () => {
    saveLocale('hi')
    expect(getStoredLocale()).toBe('hi')
  })

  it('returns en when stored value is invalid', () => {
    localStorage.setItem('arkive_locale', 'xx')
    expect(getStoredLocale()).toBe('en')
  })
})

describe('saveLocale', () => {
  it('persists locale to localStorage', () => {
    saveLocale('fr')
    expect(localStorage.getItem('arkive_locale')).toBe('fr')
  })

  it('can save all supported locales without error', () => {
    for (const locale of Object.keys(SUPPORTED_LANGUAGES) as SupportedLocale[]) {
      expect(() => saveLocale(locale)).not.toThrow()
    }
  })
})

describe('needsReview', () => {
  it('returns false for English', () => {
    expect(needsReview('en')).toBe(false)
  })

  it('returns false for European languages', () => {
    expect(needsReview('es')).toBe(false)
    expect(needsReview('fr')).toBe(false)
    expect(needsReview('de')).toBe(false)
    expect(needsReview('pt')).toBe(false)
    expect(needsReview('id')).toBe(false)
  })

  it('returns true for Indic languages', () => {
    expect(needsReview('hi')).toBe(true)
    expect(needsReview('mr')).toBe(true)
    expect(needsReview('kn')).toBe(true)
    expect(needsReview('bn')).toBe(true)
    expect(needsReview('ta')).toBe(true)
    expect(needsReview('te')).toBe(true)
    expect(needsReview('gu')).toBe(true)
  })

  it('returns true for CJK languages', () => {
    expect(needsReview('zh')).toBe(true)
    expect(needsReview('ja')).toBe(true)
  })
})

describe('REVIEW_REQUIRED_KEYS', () => {
  it('includes all emergency medical keys', () => {
    expect(REVIEW_REQUIRED_KEYS).toContain('emergency.blood_group')
    expect(REVIEW_REQUIRED_KEYS).toContain('emergency.allergies')
    expect(REVIEW_REQUIRED_KEYS).toContain('emergency.conditions')
    expect(REVIEW_REQUIRED_KEYS).toContain('emergency.medications')
    expect(REVIEW_REQUIRED_KEYS).toContain('emergency.emergency_contacts')
  })
})

describe('REVIEW_REQUIRED_LOCALES', () => {
  it('does not include English', () => {
    expect(REVIEW_REQUIRED_LOCALES).not.toContain('en')
  })

  it('covers all Indic languages', () => {
    const indic: SupportedLocale[] = ['hi','mr','kn','bn','ta','te','gu']
    for (const lang of indic) {
      expect(REVIEW_REQUIRED_LOCALES).toContain(lang)
    }
  })
})

describe('entitlement mapping', () => {
  it('maps known tier strings correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ active: true, tier: 'managed_relay', validUntil: '2027-01-01', familyId: 'fam1' }),
    })
    globalThis.fetch = mockFetch

    const { refreshEntitlementFromRelay } = await import('../payments/entitlement')
    const ent = await refreshEntitlementFromRelay('https://relay.example.com', 'tok')
    expect(ent?.syncTierId).toBe('managed_relay')
    expect(ent?.validUntil).toBe('2027-01-01')
  })

  it('returns null on network failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'))
    const { refreshEntitlementFromRelay } = await import('../payments/entitlement')
    const ent = await refreshEntitlementFromRelay('https://relay.example.com', 'tok')
    expect(ent).toBeNull()
  })

  it('maps unknown tier to local_lan', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ active: false, tier: 'unknown_future_tier', validUntil: null, familyId: 'fam1' }),
    })
    const { refreshEntitlementFromRelay } = await import('../payments/entitlement')
    const ent = await refreshEntitlementFromRelay('https://relay.example.com', 'tok')
    expect(ent?.syncTierId).toBe('local_lan')
  })
})
