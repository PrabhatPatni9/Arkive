import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, RotateCcw, Shield, ChevronRight, Pencil, Check, X, Baby } from 'lucide-react'
import { getFamily, setBackupAdmin, renameDevice } from '../family/familyStore'
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

function MemberCard({ member, isBackupAdmin }: { member: FamilyMember; isBackupAdmin: boolean }) {
  const roleLabel = member.role === 'admin' ? 'Admin'
    : member.role === 'view_only' ? 'View only'
    : 'Member'

  return (
    <div className="member-card">
      <Avatar name={member.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="member-name">
          {member.name}
          {member.isDependent && (
            <Baby size={13} style={{ marginLeft: 6, display: 'inline', verticalAlign: 'middle', color: 'var(--text-muted)' }} />
          )}
        </p>
        <p className="member-role">
          {roleLabel}
          {member.isDependent ? ' · Managed' : ' · Full access'}
          {isBackupAdmin && ' · Backup admin'}
        </p>
      </div>
      {member.role === 'admin' && (
        <Shield size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
      )}
    </div>
  )
}

export function FamilyScreen() {
  const navigate = useNavigate()
  const [family, setFamily] = useState(getFamily)
  const [showKeyInfo, setShowKeyInfo] = useState(false)
  const [showBackupPicker, setShowBackupPicker] = useState(false)
  const [editingDevice, setEditingDevice] = useState(false)
  const [deviceLabel, setDeviceLabel] = useState(() => getFamily()?.deviceLabel ?? '')

  if (!family) {
    navigate('/onboarding', { replace: true })
    return null
  }

  function handleSetBackupAdmin(memberId: string) {
    setBackupAdmin(memberId)
    setFamily(getFamily())
    setShowBackupPicker(false)
  }

  function handleRenameDevice() {
    renameDevice(deviceLabel)
    setFamily(getFamily())
    setEditingDevice(false)
  }

  const eligibleBackupAdmins = family.members.filter(
    m => m.memberId !== family.myMemberId && !m.isDependent && m.role !== 'admin'
  )
  const backupAdmin = family.members.find(m => m.memberId === family.backupAdminMemberId)
  const needsBackupAdmin = family.role === 'admin' && !family.backupAdminMemberId && eligibleBackupAdmins.length > 0

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
        {/* Backup admin nudge */}
        {needsBackupAdmin && (
          <div style={{
            background: 'rgba(245,166,35,0.1)',
            border: '1.5px solid rgba(245,166,35,0.35)',
            borderRadius: 12,
            padding: '12px 14px',
            marginTop: 16,
            marginBottom: 8,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}>
            <Shield size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--warning)' }}>No backup admin set</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                Designate a backup admin so the family vault can be managed if you're unavailable.
              </p>
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginTop: 10, background: 'var(--warning)', color: '#fff' }}
                onClick={() => setShowBackupPicker(true)}
              >
                Set backup admin
              </button>
            </div>
          </div>
        )}

        {/* Backup admin picker */}
        {showBackupPicker && (
          <div className="card card-p" style={{ marginTop: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Choose backup admin</p>
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onClick={() => setShowBackupPicker(false)}>
                <X size={18} color="var(--text-muted)" />
              </button>
            </div>
            {eligibleBackupAdmins.map(m => (
              <button
                key={m.memberId}
                type="button"
                className="settings-row"
                style={{ marginBottom: 6 }}
                onClick={() => handleSetBackupAdmin(m.memberId)}
              >
                <span className="settings-row-label">{m.name}</span>
                <ChevronRight size={16} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        )}

        <p className="section-header" style={{ marginTop: needsBackupAdmin ? 8 : 16 }}>Members</p>
        <div className="card-row">
          {family.members.map((m) => (
            <MemberCard key={m.memberId} member={m} isBackupAdmin={m.memberId === family.backupAdminMemberId} />
          ))}

          {/* Change backup admin (when already set) */}
          {family.role === 'admin' && backupAdmin && eligibleBackupAdmins.length > 1 && !showBackupPicker && (
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}
              onClick={() => setShowBackupPicker(true)}
            >
              Change backup admin
            </button>
          )}

          {family.role === 'admin' && (
            <>
              <button
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent', border: '1.5px dashed var(--border)',
                  borderRadius: 'var(--r-card)', padding: '14px 16px',
                  minHeight: 64, color: 'var(--text-muted)',
                  fontSize: 14, cursor: 'pointer', width: '100%',
                }}
                onClick={() => navigate('/family/approve-join')}
              >
                <UserPlus size={20} aria-hidden />
                Approve a member join request
              </button>
              <button
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent', border: '1.5px dashed var(--border)',
                  borderRadius: 'var(--r-card)', padding: '14px 16px',
                  minHeight: 64, color: 'var(--text-muted)',
                  fontSize: 14, cursor: 'pointer', width: '100%',
                }}
                onClick={() => navigate('/family/add-dependent')}
              >
                <Baby size={20} aria-hidden />
                Add a dependent (child, elder…)
              </button>
            </>
          )}
        </div>

        <p className="section-header">This Device</p>
        <div className="card card-p" style={{ marginBottom: 8 }}>
          {editingDevice ? (
            <div>
              <input
                type="text"
                value={deviceLabel}
                onChange={e => setDeviceLabel(e.target.value)}
                maxLength={60}
                autoFocus
                style={{
                  width: '100%', border: '1.5px solid var(--accent)', borderRadius: 10,
                  padding: '10px 12px', fontSize: 15, color: 'var(--text)',
                  background: 'var(--bg)', outline: 'none', marginBottom: 10,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => { setDeviceLabel(family.deviceLabel); setEditingDevice(false) }}
                >
                  <X size={14} style={{ marginRight: 4 }} />
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={handleRenameDevice}
                  disabled={!deviceLabel.trim()}
                >
                  <Check size={14} style={{ marginRight: 4 }} />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{family.deviceLabel}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  This device · ID {family.deviceId.slice(0, 12)}…
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Shield size={16} color="var(--success)" />
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 36, height: 36 }}
                  aria-label="Rename device"
                  onClick={() => setEditingDevice(true)}
                >
                  <Pencil size={15} />
                </button>
              </div>
            </div>
          )}
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
