import { useNavigate } from 'react-router-dom'
import { Shield, Heart, AlertTriangle, ChevronRight, Phone } from 'lucide-react'
import { getFamily } from '../family/familyStore'
import type { FamilyMember } from '../family/familyStore'

function fieldRow(label: string, value: string | undefined) {
  if (!value?.trim()) return null
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{value}</p>
    </div>
  )
}

function MemberCard({ member, onViewCard }: { member: FamilyMember; onViewCard: () => void }) {
  const hasData = member.bloodGroup || member.allergies || member.conditions || member.medications

  return (
    <div className="card card-p" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: hasData ? 12 : 0 }}>
        <div className="avatar" style={{ width: 44, height: 44, fontSize: 18 }}>
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{member.name}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{member.role}</p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          style={{ minHeight: 32, padding: '0 10px', fontSize: 12, flexShrink: 0 }}
          onClick={onViewCard}
        >
          Card <ChevronRight size={14} />
        </button>
      </div>

      {hasData && (
        <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginTop: 4 }}>
          {fieldRow('Blood Group', member.bloodGroup)}
          {fieldRow('Allergies', member.allergies)}
          {fieldRow('Conditions', member.conditions)}
          {fieldRow('Current Medications', member.medications)}
          {member.emergencyContacts && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Phone size={14} color="var(--accent)" />
              <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{member.emergencyContacts}</p>
            </div>
          )}
        </div>
      )}

      {!hasData && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          No emergency data added yet — tap "Card" to set up.
        </p>
      )}
    </div>
  )
}

export function EmergencyScreen() {
  const navigate = useNavigate()
  const family = getFamily()

  if (!family) {
    navigate('/onboarding', { replace: true })
    return null
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title" style={{ color: 'var(--danger)' }}>Emergency</p>
          <p className="screen-subtitle">Critical health data — always offline</p>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: 'rgba(229,62,62,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={22} color="var(--danger)" />
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 8 }}>
        {/* Info banner */}
        <div style={{
          background: 'rgba(229,62,62,0.08)',
          border: '1.5px solid rgba(229,62,62,0.3)',
          borderRadius: 12, padding: 14,
          display: 'flex', gap: 10, marginBottom: 16,
        }}>
          <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
            This data is stored on your device and accessible offline — no internet required.
            Share with paramedics or doctors in an emergency.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Heart size={16} color="var(--danger)" />
          <p className="section-header" style={{ margin: 0 }}>Family Members</p>
        </div>

        {family.members.map(member => (
          <MemberCard
            key={member.memberId}
            member={member}
            onViewCard={() => navigate(`/emergency/card/${member.memberId}`)}
          />
        ))}

        <div className="card card-p" style={{ marginTop: 16, background: 'var(--accent-bg)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>
            How emergency data works
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Emergency data is encrypted with the family key like all other data. The optional Emergency Card creates a printable/QR copy with selected fields — plaintext, by your explicit choice, for paramedics who cannot log in to any app.
          </p>
        </div>
      </div>
    </main>
  )
}
