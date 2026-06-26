import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, RotateCcw, Shield, ChevronRight } from 'lucide-react'
import { getFamily } from '../family/familyStore'
import type { FamilyMember } from '../family/familyStore'

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function MemberCard({ member }: { member: FamilyMember }) {
  const roleLabel = member.role === 'admin' ? 'Admin'
    : member.role === 'view_only' ? 'View only'
    : 'Member'

  return (
    <div className="member-card">
      <Avatar name={member.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="member-name">{member.name}</p>
        <p className="member-role">{roleLabel} · {member.isDependent ? 'Dependent' : 'Full access'}</p>
      </div>
      {member.role === 'admin' && (
        <Shield size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
      )}
    </div>
  )
}

export function FamilyScreen() {
  const navigate = useNavigate()
  const family = getFamily()
  const [showKeyInfo, setShowKeyInfo] = useState(false)

  if (!family) {
    navigate('/onboarding', { replace: true })
    return null
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">{family.familyName}</p>
          <p className="screen-subtitle">
            {family.familyType === 'joint' ? 'Joint family' : 'Nuclear family'} · {family.members.length} member{family.members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {family.role === 'admin' && (
          <button
            className="icon-btn"
            aria-label="Approve new member"
            type="button"
            onClick={() => navigate('/family/approve-join')}
          >
            <UserPlus size={20} />
          </button>
        )}
      </header>

      <div className="screen-body">
        <p className="section-header" style={{ marginTop: 16 }}>Members</p>
        <div className="card-row">
          {family.members.map((m) => (
            <MemberCard key={m.memberId} member={m} />
          ))}
          {family.role === 'admin' && (
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'transparent',
                border: '1.5px dashed var(--border)',
                borderRadius: 'var(--r-card)',
                padding: '14px 16px',
                minHeight: 64,
                color: 'var(--text-muted)',
                fontSize: 14,
                cursor: 'pointer',
                width: '100%',
              }}
              onClick={() => navigate('/family/approve-join')}
            >
              <UserPlus size={20} aria-hidden />
              Approve a new member join request
            </button>
          )}
        </div>

        <p className="section-header">Devices</p>
        <div className="card card-p" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{family.deviceLabel}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                This device · ID {family.deviceId.slice(0, 12)}…
              </p>
            </div>
            <Shield size={16} color="var(--success)" />
          </div>
        </div>

        <p className="section-header">Key Recovery</p>
        <div className="card card-p" style={{ marginTop: 0 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
            {family.recoveryPackage
              ? 'Recovery phrase set up. Store it somewhere safe — you need it if all devices are lost.'
              : 'You joined this family. If you lose your device, ask an admin to re-invite you.'}
          </p>
          {family.recoveryPackage && (
            <button
              className="btn btn-outline"
              style={{ marginBottom: 8 }}
              type="button"
              onClick={() => setShowKeyInfo(!showKeyInfo)}
            >
              {showKeyInfo ? 'Hide' : 'View'} recovery info
            </button>
          )}
          {showKeyInfo && (
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, marginTop: 8 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your family key is protected by your recovery phrase via Argon2id key derivation.
                The key itself is encrypted and stored locally — Arkive never holds it.
              </p>
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Family Key ID</p>
                <code style={{ fontSize: 12, color: 'var(--text)', wordBreak: 'break-all' }}>
                  {family.familyKey.keyId}
                </code>
              </div>
            </div>
          )}
          <button
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            type="button"
            onClick={() => navigate('/settings')}
          >
            <RotateCcw size={16} />
            Recovery settings
            <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
          </button>
        </div>
      </div>
    </main>
  )
}
