import { describe, it, expect, beforeEach } from 'vitest'
import {
  addReminder,
  getReminders,
  markDone,
  deleteReminder,
  computeNextDue,
  isOverdue,
  isDueSoon,
  shouldNotify,
  parseLocalDate,
  formatDate,
  createDocumentExpiryReminder,
  createBirthdayReminder,
} from './engine'
import type { Reminder } from './types'

// Stub localStorage
const store: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { for (const k in store) delete store[k] },
  key: (i: number) => Object.keys(store)[i] ?? null,
  length: 0,
}

beforeEach(() => {
  for (const k in store) delete store[k]
})

const FAM = 'fam-001'

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return addReminder({
    familyId: FAM,
    memberId: null,
    type: 'custom',
    title: 'Test reminder',
    dueDate: '2030-01-15',
    advanceNoticeDays: 7,
    recurrence: null,
    timezone: 'Asia/Kolkata',
    ...overrides,
  })
}

describe('reminder CRUD', () => {
  it('adds a reminder and retrieves it', () => {
    const r = makeReminder({ title: 'Test' })
    const list = getReminders(FAM)
    expect(list).toHaveLength(1)
    expect(list[0].reminderId).toBe(r.reminderId)
  })

  it('deletes a reminder', () => {
    const r = makeReminder()
    deleteReminder(r.reminderId)
    expect(getReminders(FAM)).toHaveLength(0)
  })

  it('scopes by familyId', () => {
    makeReminder({ familyId: FAM })
    makeReminder({ familyId: 'other-fam' })
    expect(getReminders(FAM)).toHaveLength(1)
  })
})

describe('markDone', () => {
  it('records a completion', () => {
    const r = makeReminder()
    markDone(r.reminderId, 'member-1')
    const updated = getReminders(FAM)[0]
    expect(updated.completions).toHaveLength(1)
    expect(updated.completions[0].completedBy).toBe('member-1')
  })

  it('advances dueDate for monthly recurring reminder', () => {
    const r = makeReminder({
      dueDate: '2030-01-15',
      recurrence: { unit: 'monthly', interval: 1, end: { type: 'never' } },
    })
    markDone(r.reminderId, 'member-1')
    const updated = getReminders(FAM)[0]
    expect(updated.dueDate).toBe('2030-02-15')
  })

  it('advances dueDate for yearly recurring reminder', () => {
    const r = makeReminder({
      dueDate: '2030-03-10',
      recurrence: { unit: 'yearly', interval: 1, end: { type: 'never' } },
    })
    markDone(r.reminderId, 'member-1')
    const updated = getReminders(FAM)[0]
    expect(updated.dueDate).toBe('2031-03-10')
  })
})

describe('computeNextDue', () => {
  it('returns null for one-time reminders', () => {
    const r = makeReminder({ recurrence: null })
    const next = computeNextDue(r, parseLocalDate('2030-01-15'))
    expect(next).toBeNull()
  })

  it('computes next monthly due date', () => {
    const r = makeReminder({
      dueDate: '2030-01-01',
      recurrence: { unit: 'monthly', interval: 1, end: { type: 'never' } },
    })
    const next = computeNextDue(r, parseLocalDate('2030-01-01'))
    expect(formatDate(next!)).toBe('2030-02-01')
  })

  it('computes next weekly due date', () => {
    const r = makeReminder({
      dueDate: '2030-01-01',
      recurrence: { unit: 'weekly', interval: 1, end: { type: 'never' } },
    })
    const next = computeNextDue(r, parseLocalDate('2030-01-01'))
    expect(formatDate(next!)).toBe('2030-01-08')
  })

  it('computes next yearly due date', () => {
    const r = makeReminder({
      dueDate: '2030-06-15',
      recurrence: { unit: 'yearly', interval: 1, end: { type: 'never' } },
    })
    const next = computeNextDue(r, parseLocalDate('2030-06-15'))
    expect(formatDate(next!)).toBe('2031-06-15')
  })

  it('returns null when after_n completions exceeded', () => {
    const r = makeReminder({
      dueDate: '2030-01-01',
      recurrence: { unit: 'monthly', interval: 1, end: { type: 'after_n', count: 1 } },
    })
    // Simulate 1 completion already
    r.completions = [{ completedAt: '2030-01-01T00:00:00Z', completedBy: 'member-1' }]
    const next = computeNextDue(r, parseLocalDate('2030-01-01'))
    expect(next).toBeNull()
  })

  it('returns null when past on_date end', () => {
    const r = makeReminder({
      dueDate: '2030-01-01',
      recurrence: { unit: 'monthly', interval: 1, end: { type: 'on_date', date: '2030-01-31' } },
    })
    const next = computeNextDue(r, parseLocalDate('2030-01-15'))
    // Next would be 2030-02-01 which is past 2030-01-31
    expect(next).toBeNull()
  })
})

describe('status checks', () => {
  it('isOverdue for past date', () => {
    const r = makeReminder({ dueDate: '2020-01-01' })
    expect(isOverdue(r)).toBe(true)
  })

  it('not overdue for future date', () => {
    const r = makeReminder({ dueDate: '2099-12-31' })
    expect(isOverdue(r)).toBe(false)
  })

  it('isDueSoon within advance notice window', () => {
    const today = new Date()
    const d = new Date(today)
    d.setDate(d.getDate() + 3)
    const r = makeReminder({ dueDate: formatDate(d), advanceNoticeDays: 7 })
    expect(isDueSoon(r, 7)).toBe(true)
  })

  it('not isDueSoon when outside window', () => {
    const today = new Date()
    const d = new Date(today)
    d.setDate(d.getDate() + 30)
    const r = makeReminder({ dueDate: formatDate(d), advanceNoticeDays: 7 })
    expect(isDueSoon(r, 7)).toBe(false)
  })

  it('shouldNotify uses advanceNoticeDays', () => {
    const today = new Date()
    const d = new Date(today)
    d.setDate(d.getDate() + 5)
    const r = makeReminder({ dueDate: formatDate(d), advanceNoticeDays: 7 })
    expect(shouldNotify(r)).toBe(true)
  })
})

describe('convenience builders', () => {
  it('createDocumentExpiryReminder creates a document_expiry reminder', () => {
    const r = createDocumentExpiryReminder({
      familyId: FAM,
      memberId: null,
      documentTitle: 'Passport',
      expiryDate: '2028-03-01',
    })
    expect(r.type).toBe('document_expiry')
    expect(r.title).toContain('Passport')
    expect(r.dueDate).toBe('2028-03-01')
    expect(r.advanceNoticeDays).toBe(30)
  })

  it('createBirthdayReminder sets yearly recurrence', () => {
    const r = createBirthdayReminder({
      familyId: FAM,
      memberId: 'member-1',
      name: 'Grandpa',
      dateOfBirth: '1950-05-20',
    })
    expect(r.type).toBe('birthday')
    expect(r.recurrence?.unit).toBe('yearly')
    expect(r.recurrence?.interval).toBe(1)
    expect(r.title).toContain('Grandpa')
    // Due date should be in the future
    const due = parseLocalDate(r.dueDate)
    expect(due.getTime()).toBeGreaterThan(Date.now())
  })
})
