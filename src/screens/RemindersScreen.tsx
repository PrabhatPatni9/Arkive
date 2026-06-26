import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Plus, AlertTriangle, Calendar } from 'lucide-react'
import {
  getReminders,
  markDone,
  addReminder,
  parseLocalDate,
  isOverdue,
  isDueSoon,
} from '../reminders/engine'
import type { Reminder, ReminderType } from '../reminders/types'
import { getFamily } from '../family/familyStore'

const TYPE_LABELS: Record<ReminderType, string> = {
  document_expiry:      'Document Expiry',
  medical_appointment:  'Medical Appointment',
  insurance_renewal:    'Insurance Renewal',
  puc:                  'PUC',
  birthday:             'Birthday',
  anniversary:          'Anniversary',
  bill:                 'Bill',
  custom:               'Custom',
}

function daysUntil(dueDate: string): number {
  const today = new Date()
  const due = parseLocalDate(dueDate)
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due.getTime() - todayMidnight.getTime()) / 86_400_000)
}

function ReminderCard({ reminder, onDone }: { reminder: Reminder; onDone: () => void }) {
  const days = daysUntil(reminder.dueDate)
  const overdue = isOverdue(reminder)
  const soon = isDueSoon(reminder, reminder.advanceNoticeDays)

  let statusColor = 'var(--text-muted)'
  let statusLabel = days === 0 ? 'Today' : days > 0 ? `In ${days} day${days === 1 ? '' : 's'}` : `${Math.abs(days)}d overdue`
  if (overdue) statusColor = 'var(--danger)'
  else if (soon) statusColor = 'var(--warning)'
  else statusColor = 'var(--success)'

  return (
    <div className="card card-p" style={{ marginBottom: 8, opacity: 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: overdue ? 'rgba(229,62,62,0.1)' : 'var(--accent-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {overdue
            ? <AlertTriangle size={18} color="var(--danger)" />
            : <Bell size={18} color="var(--accent)" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{reminder.title}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {TYPE_LABELS[reminder.type]}
            {reminder.recurrence && ' · Recurring'}
          </p>
          <p style={{ fontSize: 13, color: statusColor, fontWeight: 600, marginTop: 4 }}>
            {statusLabel}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          style={{
            minHeight: 36, width: 36, padding: 0, borderRadius: 10, flexShrink: 0,
            background: 'var(--bg)', border: '1.5px solid var(--border)',
          }}
          onClick={onDone}
          aria-label="Mark done"
        >
          <Check size={16} color="var(--success)" />
        </button>
      </div>
      {reminder.description && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, marginLeft: 52, lineHeight: 1.4 }}>
          {reminder.description}
        </p>
      )}
    </div>
  )
}

function AddReminderForm({ familyId, memberId, onAdded }: { familyId: string; memberId: string | null; onAdded: () => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ReminderType>('custom')
  const [dueDate, setDueDate] = useState('')
  const [advance, setAdvance] = useState(7)
  const [error, setError] = useState('')

  function handleAdd() {
    if (!title.trim()) { setError('Title required'); return }
    if (!dueDate) { setError('Due date required'); return }
    setError('')
    addReminder({
      familyId,
      memberId,
      type,
      title: title.trim(),
      dueDate,
      advanceNoticeDays: advance,
      recurrence: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    })
    setTitle('')
    setDueDate('')
    onAdded()
  }

  return (
    <div className="card card-p" style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Add Reminder</p>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Reminder title"
        style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'var(--text)', background: 'var(--bg)', outline: 'none', marginBottom: 8 }}
      />
      <select
        value={type}
        onChange={e => setType(e.target.value as ReminderType)}
        style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'var(--text)', background: 'var(--bg)', outline: 'none', marginBottom: 8 }}
      >
        {(Object.entries(TYPE_LABELS) as [ReminderType, string][]).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <input
        type="date"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
        style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'var(--text)', background: 'var(--bg)', outline: 'none', marginBottom: 8 }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <label style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Remind</label>
        <input
          type="number"
          min={0}
          max={365}
          value={advance}
          onChange={e => setAdvance(Number(e.target.value))}
          style={{ width: 64, border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 14, color: 'var(--text)', background: 'var(--bg)', outline: 'none' }}
        />
        <label style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>days before</label>
      </div>
      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
      <button className="btn btn-primary" type="button" onClick={handleAdd}>Add</button>
    </div>
  )
}

export function RemindersScreen() {
  const navigate = useNavigate()
  const family = getFamily()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (family) setReminders(getReminders(family.familyId))
  }, [family])

  if (!family) { navigate('/onboarding', { replace: true }); return null }

  function reload() { setReminders(getReminders(family!.familyId)); setShowAdd(false) }

  function handleDone(reminderId: string) {
    markDone(reminderId, family!.myMemberId)
    reload()
  }

  const overdue = reminders.filter(r => isOverdue(r))
  const upcoming = reminders.filter(r => !isOverdue(r))

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">Reminders</p>
          <p className="screen-subtitle">Expiry dates, appointments & more</p>
        </div>
        <button className="icon-btn" type="button" onClick={() => setShowAdd(!showAdd)} aria-label="Add reminder">
          <Plus size={20} />
        </button>
      </header>

      <div className="screen-body" style={{ paddingTop: 12 }}>
        {showAdd && (
          <AddReminderForm familyId={family.familyId} memberId={family.myMemberId} onAdded={reload} />
        )}

        {overdue.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={16} color="var(--danger)" />
              <p className="section-header" style={{ margin: 0, color: 'var(--danger)' }}>Overdue</p>
            </div>
            {overdue.map(r => (
              <ReminderCard key={r.reminderId} reminder={r} onDone={() => handleDone(r.reminderId)} />
            ))}
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: overdue.length ? 16 : 0, marginBottom: 10 }}>
              <Calendar size={16} color="var(--accent)" />
              <p className="section-header" style={{ margin: 0 }}>Upcoming</p>
            </div>
            {upcoming.map(r => (
              <ReminderCard key={r.reminderId} reminder={r} onDone={() => handleDone(r.reminderId)} />
            ))}
          </>
        )}

        {reminders.length === 0 && !showAdd && (
          <div className="empty-row" style={{ flexDirection: 'column', alignItems: 'center', gap: 8, minHeight: 120, justifyContent: 'center', textAlign: 'center' }}>
            <Bell size={24} color="var(--text-muted)" />
            <span>No reminders yet — add document expiry dates, appointments, and more.</span>
          </div>
        )}
      </div>
    </main>
  )
}
