import { FileText, Heart, Shield, AlertTriangle, Bell, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getFamily } from '../family/familyStore'
import { getReminders, isOverdue, isDueSoon } from '../reminders/engine'

function greetingForHour(h: number) {
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const VAULT_CARDS = [
  { icon: FileText, title: 'Documents', desc: 'Aadhaar, passport, wills', to: '/vault' },
  { icon: Heart,    title: 'Medical',   desc: 'Health records & reports', to: '/vault' },
]

export function HomeScreen() {
  const navigate = useNavigate()
  const greeting = greetingForHour(new Date().getHours())
  const family = getFamily()
  const myName = family?.members.find(m => m.memberId === family.myMemberId)?.name ?? 'there'

  // Upcoming reminders count
  const reminders = family ? getReminders(family.familyId) : []
  const overdueCount = reminders.filter(r => isOverdue(r)).length
  const soonCount = reminders.filter(r => !isOverdue(r) && isDueSoon(r, r.advanceNoticeDays)).length

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20, marginBottom: 0 }}>
        <div>
          <p className="screen-title">{greeting}, {myName.split(' ')[0]}</p>
          <p className="screen-subtitle">{family?.familyName ?? 'Your family vault'}</p>
        </div>
        <div
          className="avatar"
          style={{ width: 44, height: 44, fontSize: 18, cursor: 'default' }}
          aria-label="Profile"
        >
          {myName.charAt(0).toUpperCase()}
        </div>
      </header>

      <div className="screen-body">
        {/* Security badge */}
        <div style={{ marginTop: 16, marginBottom: 8 }}>
          <span className="section-badge">
            <Shield size={10} style={{ display: 'inline', marginRight: 4 }} />
            End-to-end encrypted
          </span>
        </div>

        <p className="text-muted" style={{ marginBottom: 20, fontSize: 13 }}>
          Operator never sees your data. All keys live on your device.
        </p>

        {/* Emergency banner */}
        <button
          type="button"
          onClick={() => navigate('/emergency')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', background: 'rgba(229,62,62,0.08)',
            border: '1.5px solid rgba(229,62,62,0.3)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'rgba(229,62,62,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertTriangle size={20} color="var(--danger)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)' }}>Emergency Access</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Blood groups, allergies, medications — always offline
            </p>
          </div>
          <ChevronRight size={18} color="var(--danger)" />
        </button>

        {/* Vault quick access */}
        <p className="section-header" style={{ marginTop: 0 }}>Quick Access</p>
        <div className="card-grid">
          {VAULT_CARDS.map(({ icon: Icon, title, desc, to }) => (
            <button
              key={title}
              className="feature-card"
              onClick={() => navigate(to)}
              type="button"
              style={{ textAlign: 'left', border: 'none' }}
            >
              <div className="feature-icon">
                <Icon size={18} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </button>
          ))}
        </div>

        {/* Reminders section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 10px' }}>
          <p className="section-header" style={{ margin: 0 }}>Coming Up</p>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
            onClick={() => navigate('/reminders')}
          >
            See all
          </button>
        </div>

        {overdueCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/reminders')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              background: 'rgba(229,62,62,0.08)', border: '1.5px solid rgba(229,62,62,0.3)',
              borderRadius: 12, padding: '12px 16px', marginBottom: 8, cursor: 'pointer',
            }}
          >
            <Bell size={18} color="var(--danger)" />
            <p style={{ fontSize: 14, color: 'var(--danger)', fontWeight: 600 }}>
              {overdueCount} overdue reminder{overdueCount !== 1 ? 's' : ''}
            </p>
            <ChevronRight size={16} color="var(--danger)" style={{ marginLeft: 'auto' }} />
          </button>
        )}

        {soonCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/reminders')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 16px', marginBottom: 8, cursor: 'pointer',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <Bell size={18} color="var(--warning)" />
            <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
              {soonCount} reminder{soonCount !== 1 ? 's' : ''} coming up
            </p>
            <ChevronRight size={16} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
          </button>
        )}

        {reminders.length === 0 && (
          <div className="card-row">
            <div className="empty-row">
              No reminders yet — add document expiry dates to get started
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
