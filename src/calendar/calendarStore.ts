import type { FamilyMember } from '../family/familyStore'

export type CalendarEventType = 'birthday' | 'reminder' | 'appointment' | 'expiry' | 'custom'

export interface CalendarEvent {
  eventId: string
  type: CalendarEventType
  title: string
  date: string           // ISO date YYYY-MM-DD
  time?: string          // HH:MM optional
  memberId?: string
  memberName?: string
  notes?: string
  recurring?: 'yearly'
  sourceId?: string      // reminderId or docId for linked events
}

const EVENTS_KEY = 'arkive_calendar_v1'

export function listEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : []
  } catch { return [] }
}

function saveEvents(events: CalendarEvent[]): void {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
}

export function addEvent(params: Omit<CalendarEvent, 'eventId'>): CalendarEvent {
  const event: CalendarEvent = { eventId: crypto.randomUUID(), ...params }
  const events = listEvents()
  events.push(event)
  saveEvents(events)
  return event
}

export function deleteEvent(eventId: string): void {
  saveEvents(listEvents().filter(e => e.eventId !== eventId))
}

export function getEventsForMonth(year: number, month: number): CalendarEvent[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return listEvents().filter(e => e.date.startsWith(prefix))
}

export function getEventsForDate(date: string): CalendarEvent[] {
  return listEvents().filter(e => e.date === date)
}

// Sync birthday events from family members (idempotent — keyed by memberId)
export function syncBirthdayEvents(members: FamilyMember[]): void {
  const events = listEvents()
  const existingBirthdays = new Set(
    events.filter(e => e.type === 'birthday' && e.sourceId).map(e => e.sourceId)
  )

  const toAdd: CalendarEvent[] = []
  for (const m of members) {
    if (!m.dateOfBirth) continue
    if (existingBirthdays.has(m.memberId)) continue
    // Store as the current year so the calendar can show it
    const dob = m.dateOfBirth  // YYYY-MM-DD
    const [, mm, dd] = dob.split('-')
    const thisYear = new Date().getFullYear()
    toAdd.push({
      eventId: crypto.randomUUID(),
      type: 'birthday',
      title: `${m.name}'s Birthday`,
      date: `${thisYear}-${mm}-${dd}`,
      memberId: m.memberId,
      memberName: m.name,
      recurring: 'yearly',
      sourceId: m.memberId,
    })
  }

  if (toAdd.length > 0) {
    saveEvents([...events, ...toAdd])
  }
}
