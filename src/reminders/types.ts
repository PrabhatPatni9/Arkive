export type ReminderType =
  | 'document_expiry'
  | 'medical_appointment'
  | 'insurance_renewal'
  | 'puc'
  | 'birthday'
  | 'anniversary'
  | 'bill'
  | 'custom'

export type RecurrenceUnit = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_days'

export type RecurrenceEnd =
  | { type: 'never' }
  | { type: 'on_date'; date: string }   // ISO date YYYY-MM-DD
  | { type: 'after_n'; count: number }

export interface Recurrence {
  unit: RecurrenceUnit
  interval: number       // 1 = every unit, 2 = every other, etc.
  end: RecurrenceEnd
}

export interface ReminderCompletion {
  completedAt: string    // ISO datetime
  completedBy: string    // memberId
}

export interface Reminder {
  reminderId: string
  familyId: string
  memberId: string | null          // null = family-wide reminder
  type: ReminderType
  title: string
  description?: string
  dueDate: string                  // ISO date YYYY-MM-DD (first/next occurrence)
  advanceNoticeDays: number        // notify this many days before dueDate
  recurrence: Recurrence | null    // null = one-time
  timezone: string                 // IANA, e.g. "Asia/Kolkata"
  linkedDocumentId?: string
  completions: ReminderCompletion[]
  createdAt: string                // ISO datetime
  updatedAt: string
}

export type ReminderInput = Omit<Reminder, 'reminderId' | 'completions' | 'createdAt' | 'updatedAt'>
