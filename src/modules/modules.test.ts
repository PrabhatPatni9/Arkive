import { describe, it, expect, beforeEach } from 'vitest'

// ── localStorage stub ────────────────────────────────────────────────────────
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { for (const k in store) delete store[k] },
  length: 0,
  key: () => null,
} as unknown as Storage

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// ── Module feature flags ─────────────────────────────────────────────────────
import { isModuleEnabled, setModuleEnabled, getAllModuleStates } from './store'
import { MODULE_REGISTRY } from './types'

describe('module feature flags', () => {
  beforeEach(() => localStorageMock.clear())

  it('identity is enabled by default', () => {
    expect(isModuleEnabled('identity')).toBe(true)
  })

  it('insurance is disabled by default', () => {
    expect(isModuleEnabled('insurance')).toBe(false)
  })

  it('enabling a module persists and reads back', () => {
    setModuleEnabled('insurance', true)
    expect(isModuleEnabled('insurance')).toBe(true)
  })

  it('disabling a module persists', () => {
    setModuleEnabled('identity', false)
    expect(isModuleEnabled('identity')).toBe(false)
  })

  it('getAllModuleStates returns all modules', () => {
    const states = getAllModuleStates()
    for (const m of MODULE_REGISTRY) {
      expect(states).toHaveProperty(m.id)
    }
  })

  it('getAllModuleStates reflects toggles', () => {
    setModuleEnabled('vehicles', true)
    const states = getAllModuleStates()
    expect(states.vehicles).toBe(true)
    expect(states.expenses).toBe(false)
  })
})

// ── Insurance store ──────────────────────────────────────────────────────────
import { getPolicies, addPolicy, deletePolicy, isPolicyExpiringSoon } from './insurance/store'

describe('insurance store', () => {
  beforeEach(() => localStorageMock.clear())

  const base = {
    familyId: 'fam1',
    memberId: 'mem1',
    insurer: 'Star Health',
    policyNumber: 'SH-001',
    policyType: 'health' as const,
    sumInsured: 500000,
    premium: 12000,
    premiumCycle: 'yearly' as const,
    startDate: '2024-01-01',
    expiryDate: '2025-01-01',
  }

  it('starts empty', () => {
    expect(getPolicies('fam1')).toHaveLength(0)
  })

  it('addPolicy returns policy with id', () => {
    const p = addPolicy(base)
    expect(p.policyId).toBeTruthy()
    expect(p.insurer).toBe('Star Health')
  })

  it('addPolicy persists and getPolicies returns it', () => {
    addPolicy(base)
    expect(getPolicies('fam1')).toHaveLength(1)
  })

  it('deletePolicy removes it', () => {
    const p = addPolicy(base)
    deletePolicy(p.policyId)
    expect(getPolicies('fam1')).toHaveLength(0)
  })

  it('isPolicyExpiringSoon: future-expiry not soon', () => {
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)
    const p = addPolicy({ ...base, expiryDate: future.toISOString().slice(0, 10) })
    expect(isPolicyExpiringSoon(p)).toBe(false)
  })

  it('isPolicyExpiringSoon: expiry in 15 days is soon (default 30)', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 15)
    const p = addPolicy({ ...base, expiryDate: soon.toISOString().slice(0, 10) })
    expect(isPolicyExpiringSoon(p)).toBe(true)
  })

  it('isolates by familyId', () => {
    addPolicy(base)
    expect(getPolicies('fam2')).toHaveLength(0)
  })
})

// ── Vehicles store ───────────────────────────────────────────────────────────
import { getVehicles, addVehicle, deleteVehicle, isVehicleDocExpiringSoon } from './vehicles/store'

describe('vehicles store', () => {
  beforeEach(() => localStorageMock.clear())

  const base = {
    familyId: 'fam1',
    memberId: 'mem1',
    name: 'My Car',
    make: 'Maruti',
    model: 'Swift',
    year: 2020,
    registration: 'MH01AA1234',
    fuelType: 'petrol' as const,
  }

  it('starts empty', () => {
    expect(getVehicles('fam1')).toHaveLength(0)
  })

  it('addVehicle persists', () => {
    addVehicle(base)
    expect(getVehicles('fam1')).toHaveLength(1)
  })

  it('deleteVehicle removes it', () => {
    const v = addVehicle(base)
    deleteVehicle(v.vehicleId)
    expect(getVehicles('fam1')).toHaveLength(0)
  })

  it('isVehicleDocExpiringSoon: null date returns false', () => {
    expect(isVehicleDocExpiringSoon(undefined)).toBe(false)
  })

  it('isVehicleDocExpiringSoon: 10 days away returns true', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 10)
    expect(isVehicleDocExpiringSoon(soon.toISOString().slice(0, 10))).toBe(true)
  })
})

// ── Expenses store ───────────────────────────────────────────────────────────
import { getExpensesForMonth, addExpense, deleteExpense, sumByCategory } from './expenses/store'

describe('expenses store', () => {
  beforeEach(() => localStorageMock.clear())

  const base = {
    familyId: 'fam1',
    memberId: 'mem1',
    category: 'petrol' as const,
    amount: 500,
    currency: 'INR',
    date: '2025-03-15',
  }

  it('getExpensesForMonth returns only matching month', () => {
    addExpense(base)
    addExpense({ ...base, date: '2025-04-01' })
    expect(getExpensesForMonth('fam1', 2025, 3)).toHaveLength(1)
    expect(getExpensesForMonth('fam1', 2025, 4)).toHaveLength(1)
  })

  it('deleteExpense removes only that entry', () => {
    const e = addExpense(base)
    addExpense({ ...base, amount: 200 })
    deleteExpense(e.expenseId)
    expect(getExpensesForMonth('fam1', 2025, 3)).toHaveLength(1)
  })

  it('sumByCategory aggregates correctly', () => {
    addExpense(base)
    addExpense({ ...base, amount: 300 })
    addExpense({ ...base, category: 'milk', amount: 100 })
    const all = getExpensesForMonth('fam1', 2025, 3)
    const totals = sumByCategory(all)
    expect(totals['petrol']).toBe(800)
    expect(totals['milk']).toBe(100)
  })
})

// ── Milk store ───────────────────────────────────────────────────────────────
import { getMilkForMonth, addMilkEntry, deleteMilkEntry, monthlyMilkTotal } from './milk/store'

describe('milk store', () => {
  beforeEach(() => localStorageMock.clear())

  const base = { familyId: 'fam1', date: '2025-03-01', litres: 2.5, pricePerLitre: 60 }

  it('starts empty', () => {
    expect(getMilkForMonth('fam1', 2025, 3)).toHaveLength(0)
  })

  it('addMilkEntry upserts by date', () => {
    addMilkEntry(base)
    addMilkEntry({ ...base, litres: 3 })
    expect(getMilkForMonth('fam1', 2025, 3)).toHaveLength(1)
    expect(getMilkForMonth('fam1', 2025, 3)[0].litres).toBe(3)
  })

  it('deleteMilkEntry removes it', () => {
    const e = addMilkEntry(base)
    deleteMilkEntry(e.entryId)
    expect(getMilkForMonth('fam1', 2025, 3)).toHaveLength(0)
  })

  it('monthlyMilkTotal sums litres and cost', () => {
    addMilkEntry(base)
    addMilkEntry({ ...base, date: '2025-03-02', litres: 1.5, pricePerLitre: 60 })
    const entries = getMilkForMonth('fam1', 2025, 3)
    const { litres, cost } = monthlyMilkTotal(entries)
    expect(litres).toBeCloseTo(4.0)
    expect(cost).toBeCloseTo(240)
  })

  it('getExpensesForMonth isolates months', () => {
    addMilkEntry(base)
    addMilkEntry({ ...base, date: '2025-04-01' })
    expect(getMilkForMonth('fam1', 2025, 3)).toHaveLength(1)
  })
})

// ── Contacts store ───────────────────────────────────────────────────────────
import { getContacts, addContact, deleteContact } from './contacts/store'

describe('contacts store', () => {
  beforeEach(() => localStorageMock.clear())

  const base = { familyId: 'fam1', name: 'Dr. Sharma', category: 'doctor' as const, phone: '9876543210' }

  it('starts empty', () => {
    expect(getContacts('fam1')).toHaveLength(0)
  })

  it('addContact persists', () => {
    addContact(base)
    expect(getContacts('fam1')).toHaveLength(1)
    expect(getContacts('fam1')[0].name).toBe('Dr. Sharma')
  })

  it('deleteContact removes it', () => {
    const c = addContact(base)
    deleteContact(c.contactId)
    expect(getContacts('fam1')).toHaveLength(0)
  })
})

// ── Home devices store ───────────────────────────────────────────────────────
import { getHomeDevices, addHomeDevice, deleteHomeDevice, isWarrantyExpiringSoon } from './homedevices/store'

describe('home devices store', () => {
  beforeEach(() => localStorageMock.clear())

  const base = {
    familyId: 'fam1',
    name: 'Washing Machine',
    category: 'appliance' as const,
    brand: 'LG',
  }

  it('starts empty', () => {
    expect(getHomeDevices('fam1')).toHaveLength(0)
  })

  it('addHomeDevice persists', () => {
    addHomeDevice(base)
    expect(getHomeDevices('fam1')).toHaveLength(1)
  })

  it('deleteHomeDevice removes it', () => {
    const d = addHomeDevice(base)
    deleteHomeDevice(d.deviceId)
    expect(getHomeDevices('fam1')).toHaveLength(0)
  })

  it('isWarrantyExpiringSoon: no expiry returns false', () => {
    const d = addHomeDevice(base)
    expect(isWarrantyExpiringSoon(d)).toBe(false)
  })

  it('isWarrantyExpiringSoon: 10 days away returns true', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 10)
    const d = addHomeDevice({ ...base, warrantyExpiry: soon.toISOString().slice(0, 10) })
    expect(isWarrantyExpiringSoon(d)).toBe(true)
  })
})
