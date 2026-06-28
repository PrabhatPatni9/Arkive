import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { getFamily } from '../family/familyStore'
import {
  getEventsForMonth,
  getEventsForDate,
  syncBirthdayEvents,
  addEvent,
  deleteEvent,
} from '../calendar/calendarStore'
import type { CalendarEvent } from '../calendar/calendarStore'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function CalendarScreen() {
  const family = getFamily()
  const today = new Date()

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate()))
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([])
  const [dateEvents, setDateEvents] = useState<CalendarEvent[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(selectedDate)
  const [newTime, setNewTime] = useState('')
  const [newNotes, setNewNotes] = useState('')

  useEffect(() => {
    if (family) {
      syncBirthdayEvents(family.members)
    }
    refresh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  useEffect(() => {
    setDateEvents(getEventsForDate(selectedDate))
  }, [selectedDate])

  function refresh() {
    setMonthEvents(getEventsForMonth(year, month))
    setDateEvents(getEventsForDate(selectedDate))
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function handleAddEvent() {
    if (!newTitle.trim()) return
    addEvent({
      type: 'custom',
      title: newTitle.trim(),
      date: newDate,
      time: newTime || undefined,
      notes: newNotes.trim() || undefined,
    })
    setNewTitle('')
    setNewTime('')
    setNewNotes('')
    setShowAddForm(false)
    refresh()
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: Array<number | null> = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  // Build set of dates with events for dot display
  const datesWithEvents = new Set(monthEvents.map(e => e.date))

  if (!family) return null

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">Calendar</p>
          <p className="screen-subtitle">Family events & reminders</p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => setShowAddForm(true)}
          style={{ minHeight: 36 }}
        >
          <Plus size={16} style={{ marginRight: 4 }} />
          Add
        </button>
      </header>

      <div className="screen-body" style={{ paddingTop: 12 }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button type="button" className="icon-btn" onClick={prevMonth}><ChevronLeft size={20} /></button>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {MONTH_NAMES[month - 1]} {year}
          </p>
          <button type="button" className="icon-btn" onClick={nextMonth}><ChevronRight size={20} /></button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 20 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dateStr = isoDate(year, month, day)
            const isToday = dateStr === isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
            const isSelected = dateStr === selectedDate
            const hasEvents = datesWithEvents.has(dateStr)

            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                style={{
                  position: 'relative', aspectRatio: '1', border: 'none', borderRadius: 8,
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: isSelected ? 'var(--accent)' : isToday ? 'rgba(var(--accent-rgb, 59,130,246),0.12)' : 'transparent',
                  color: isSelected ? '#fff' : isToday ? 'var(--accent)' : 'var(--text)',
                  fontWeight: isToday || isSelected ? 700 : 400,
                  fontSize: 14,
                }}
              >
                {day}
                {hasEvents && (
                  <span style={{
                    position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                    width: 4, height: 4, borderRadius: '50%',
                    background: isSelected ? '#fff' : 'var(--accent)',
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Events for selected date */}
        <p className="section-header" style={{ marginBottom: 10 }}>
          {selectedDate === isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
            ? 'Today'
            : new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>

        {dateEvents.length === 0 ? (
          <div className="card card-p" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: '20px 16px' }}>
            No events on this day.
          </div>
        ) : (
          dateEvents.map(ev => (
            <div key={ev.eventId} className="card card-p" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{ev.title}</p>
                {ev.time && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.time}</p>}
                {ev.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ev.notes}</p>}
                {ev.recurring && <span className="section-badge" style={{ marginTop: 4 }}>Yearly</span>}
              </div>
              {ev.type === 'custom' && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ fontSize: 11, color: 'var(--danger)', minHeight: 28 }}
                  onClick={() => { deleteEvent(ev.eventId); refresh() }}
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}

        {/* Add event form */}
        {showAddForm && (
          <div className="card card-p" style={{ marginTop: 16, border: '1.5px solid var(--accent)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Add Event</p>

            <label className="form-label">Title</label>
            <input
              className="form-input"
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Event title"
              autoFocus
              style={{ marginBottom: 10 }}
            />

            <label className="form-label">Date</label>
            <input
              className="form-input"
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              style={{ marginBottom: 10 }}
            />

            <label className="form-label">Time (optional)</label>
            <input
              className="form-input"
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              style={{ marginBottom: 10 }}
            />

            <label className="form-label">Notes (optional)</label>
            <textarea
              className="form-input"
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              rows={2}
              style={{ marginBottom: 12 }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddEvent} disabled={!newTitle.trim()}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
