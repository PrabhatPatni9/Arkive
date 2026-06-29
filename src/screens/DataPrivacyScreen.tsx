import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, LogOut, Trash2, AlertTriangle } from 'lucide-react'
import { getFamily, exportFamilyData, leaveFamily, purgeAllData } from '../family/familyStore'
import { deleteFamily } from '../sync/relayClient'

const RELAY_URL = (import.meta.env.VITE_RELAY_URL as string | undefined) ?? ''

export function DataPrivacyScreen() {
  const navigate = useNavigate()
  const family = getFamily()

  const [leaveStep, setLeaveStep] = useState<'idle' | 'confirm'>('idle')
  const [purgeStep, setPurgeStep] = useState<'idle' | 'confirm'>('idle')
  const [purgeInput, setPurgeInput] = useState('')
  const [exported, setExported] = useState(false)

  if (!family) {
    navigate('/onboarding', { replace: true })
    return null
  }

  function handleExport() {
    const json = exportFamilyData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arkive-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
  }

  function handleLeave() {
    leaveFamily()
    navigate('/onboarding', { replace: true })
  }

  function handlePurge() {
    if (!family || purgeInput !== family.familyName) return
    // Best-effort relay purge (R2 blobs + D1 metadata) before wiping local state
    if (RELAY_URL && family.relayDeviceToken) {
      void deleteFamily(RELAY_URL, family.relayDeviceToken).catch(() => null)
    }
    purgeAllData()
    navigate('/onboarding', { replace: true })
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" type="button" onClick={() => navigate('/settings')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="screen-title">Data & Privacy</p>
            <p className="screen-subtitle">Export, leave, or delete your data</p>
          </div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 16 }}>

        {/* Export */}
        <div className="settings-section">
          <p className="settings-group-label">Export</p>
          <div className="card card-p" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Download size={18} color="var(--accent)" />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Export my data</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.5 }}>
                  Downloads a JSON file with your family members, health info, and reminders. Keys are not exported.
                </p>
              </div>
            </div>
            <button className="btn btn-outline" type="button" onClick={handleExport}>
              {exported ? 'Downloaded — export again?' : 'Download JSON export'}
            </button>
          </div>
        </div>

        {/* Leave */}
        <div className="settings-section">
          <p className="settings-group-label">Leave family</p>
          <div className="card card-p" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,166,35,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogOut size={18} color="var(--warning)" />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Leave this family</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.5 }}>
                  Removes all local family data from this device. The family vault continues for other members.
                  You will need to be re-invited to rejoin.
                </p>
              </div>
            </div>

            {leaveStep === 'idle' ? (
              <button
                className="btn btn-ghost"
                type="button"
                style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
                onClick={() => setLeaveStep('confirm')}
              >
                Leave family vault
              </button>
            ) : (
              <div style={{ background: 'rgba(245,166,35,0.08)', borderRadius: 10, padding: 14 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--warning)', marginBottom: 12 }}>
                  Are you sure? All local data on this device will be wiped.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" type="button" style={{ flex: 1 }} onClick={() => setLeaveStep('idle')}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-sm"
                    type="button"
                    style={{ flex: 1, background: 'var(--warning)', color: '#fff' }}
                    onClick={handleLeave}
                  >
                    Yes, leave
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete (admin only) */}
        {family.role === 'admin' && (
          <div className="settings-section">
            <p className="settings-group-label">Delete vault</p>
            <div className="card card-p" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(229,62,62,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trash2 size={18} color="var(--danger)" />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--danger)' }}>Delete family vault</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.5 }}>
                    Permanently erases all Arkive data from this device. This cannot be undone.
                    Other devices are not affected — they retain their local copies.
                  </p>
                </div>
              </div>

              {purgeStep === 'idle' ? (
                <button
                  className="btn btn-ghost"
                  type="button"
                  style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  onClick={() => setPurgeStep('confirm')}
                >
                  Delete all local data
                </button>
              ) : (
                <div style={{ background: 'rgba(229,62,62,0.06)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <AlertTriangle size={16} color="var(--danger)" />
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)' }}>
                      This cannot be undone.
                    </p>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                    Type the family name <strong style={{ color: 'var(--text)' }}>{family.familyName}</strong> to confirm:
                  </p>
                  <input
                    type="text"
                    value={purgeInput}
                    onChange={e => setPurgeInput(e.target.value)}
                    placeholder={family.familyName}
                    style={{
                      width: '100%',
                      border: '1.5px solid var(--danger)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 14,
                      color: 'var(--text)',
                      background: 'var(--bg)',
                      outline: 'none',
                      marginBottom: 12,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" type="button" style={{ flex: 1 }} onClick={() => { setPurgeStep('idle'); setPurgeInput('') }}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-sm"
                      type="button"
                      disabled={purgeInput !== family.familyName}
                      style={{ flex: 1, background: 'var(--danger)', color: '#fff' }}
                      onClick={handlePurge}
                    >
                      Delete everything
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
