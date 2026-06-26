import type { Reminder, ReminderInput, Recurrence, ReminderCompletion } from './types'

const STORAGE_KEY = 'arkive_reminders_v1'

function loadAll(): Reminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Reminder[]) : []
  } catch { return [] }
}

function saveAll(reminders: Reminder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders))
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 18)
}

export function addReminder(input: ReminderInput): Reminder {
  const reminder: Reminder = {
    ...input,
    reminderId: randomId(),
    completions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const all = loadAll()
  all.push(reminder)
  saveAll(all)
  return reminder
}

export function getReminders(familyId: string): Reminder[] {
  return loadAll().filter(r => r.familyId === familyId)
}

export function updateReminder(reminderId: string, updates: Partial<ReminderInput>): void {
  const all = loadAll()
  const idx = all.findIndex(r => r.reminderId === reminderId)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() }
  saveAll(all)
}

export function deleteReminder(reminderId: string): void {
  saveAll(loadAll().filter(r => r.reminderId !== reminderId))
}

export function markDone(reminderId: string, memberId: string): void {
  const all = loadAll()
  const r = all.find(r => r.reminderId === reminderId)
  if (!r) return
  const completion: ReminderCompletion = {
    completedAt: new Date().toISOString(),
    completedBy: memberId,
  }
  r.completions.push(completion)
  r.updatedAt = new Date().toISOString()

  // For recurring reminders, advance dueDate to the next occurrence
  if (r.recurrence) {
    const next = computeNextDue(r, parseLocalDate(r.dueDate))
    if (next) {
      r.dueDate = formatDate(next)
    }
  }

  saveAll(all)
}

// Parse a YYYY-MM-DD string as a local midnight Date
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Returns the first occurrence AFTER fromDate, or null if the recurrence has ended.
export function computeNextDue(reminder: Reminder, fromDate: Date): Date | null {
  const rec = reminder.recurrence
  if (!rec) return null

  const base = parseLocalDate(reminder.dueDate)
  let candidate = new Date(base)

  // Advance until candidate > fromDate
  let iterations = 0
  while (candidate <= fromDate) {
    iterations++
    if (iterations > 10_000) return null   // safety: recurrence without advance
    candidate = advanceByRecurrence(candidate, rec)
    if (!candidate) return null
  }

  // Check end condition
  if (rec.end.type === 'on_date') {
    const endDate = parseLocalDate(rec.end.date)
    if (candidate > endDate) return null
  } else if (rec.end.type === 'after_n') {
    // Count completions: if we've completed enough times, stop
    if (reminder.completions.length >= rec.end.count) return null
  }

  return candidate
}

function advanceByRecurrence(from: Date, rec: Recurrence): Date {
  const d = new Date(from)
  switch (rec.unit) {
    case 'daily':
      d.setDate(d.getDate() + rec.interval)
      break
    case 'weekly':
      d.setDate(d.getDate() + rec.interval * 7)
      break
    case 'monthly':
      d.setMonth(d.getMonth() + rec.interval)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + rec.interval)
      break
    case 'custom_days':
      d.setDate(d.getDate() + rec.interval)
      break
  }
  return d
}

export function isOverdue(reminder: Reminder, today = new Date()): boolean {
  const due = parseLocalDate(reminder.dueDate)
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (due >= todayMidnight) return false
  // Not overdue if completed today or after due
  if (reminder.completions.length > 0) {
    const lastDone = parseLocalDate(reminder.completions[reminder.completions.length - 1].completedAt.slice(0, 10))
    if (lastDone >= due) return false
  }
  return true
}

export function isDueSoon(reminder: Reminder, withinDays: number, today = new Date()): boolean {
  const due = parseLocalDate(reminder.dueDate)
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const windowEnd = new Date(todayMidnight)
  windowEnd.setDate(windowEnd.getDate() + withinDays)
  return due >= todayMidnight && due <= windowEnd
}

export function shouldNotify(reminder: Reminder, today = new Date()): boolean {
  return isDueSoon(reminder, reminder.advanceNoticeDays, today)
}

export function createDocumentExpiryReminder(params: {
  familyId: string
  memberId: string | null
  documentTitle: string
  expiryDate: string   // YYYY-MM-DD
  advanceNoticeDays?: number
  linkedDocumentId?: string
}): Reminder {
  return addReminder({
    familyId: params.familyId,
    memberId: params.memberId,
    type: 'document_expiry',
    title: `${params.documentTitle} expires`,
    dueDate: params.expiryDate,
    advanceNoticeDays: params.advanceNoticeDays ?? 30,
    recurrence: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    linkedDocumentId: params.linkedDocumentId,
  })
}

export function createBirthdayReminder(params: {
  familyId: string
  memberId: string
  name: string
  dateOfBirth: string   // YYYY-MM-DD
}): Reminder {
  // First birthday occurrence: set year to next occurrence
  const dob = parseLocalDate(params.dateOfBirth)
  const today = new Date()
  const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
  const nextBirthday = thisYear <= today
    ? new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate())
    : thisYear

  return addReminder({
    familyId: params.familyId,
    memberId: params.memberId,
    type: 'birthday',
    title: `${params.name}'s birthday`,
    dueDate: formatDate(nextBirthday),
    advanceNoticeDays: 7,
    recurrence: { unit: 'yearly', interval: 1, end: { type: 'never' } },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  })
}
