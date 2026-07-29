import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Copy, Check, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react'
import {
  familyThreshold, generateFamilyShares, verifySharesReconstructKey,
} from '../family/socialRecovery'
import type { ShareSet } from '../family/socialRecovery'

/**
 * Social recovery (brief recovery layer 3): split the family key into M-of-N shares among members,
 * or test that a set of shares reconstructs the key. The operator never sees a share.
 */
export function SocialRecoveryScreen() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'setup' | 'restore'>('setup')

  const threshold = familyThreshold()

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="icon-btn" onClick={() => navigate('/family')}><ArrowLeft size={20} /></button>
          <div>
            <p className="screen-title">Social recovery</p>
            <p className="screen-subtitle">Rebuild the family key from members' shares</p>
          </div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 8 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" className={tab === 'setup' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setTab('setup')}>
            Create shares
          </button>
          <button type="button" className={tab === 'restore' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setTab('restore')}>
            Test / restore
          </button>
        </div>

        {!threshold ? (
          <div className="card card-p" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Social recovery needs at least two full members (people with their own device). Invite
              more members first, or rely on your recovery phrase until then.
            </p>
          </div>
        ) : tab === 'setup' ? (
          <SetupTab threshold={threshold.threshold} total={threshold.total} />
        ) : (
          <RestoreTab threshold={threshold.threshold} />
        )}
      </div>
    </main>
  )
}

function SetupTab({ threshold, total }: { threshold: number; total: number }) {
  const [shareSet, setShareSet] = useState<ShareSet | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  function copy(id: string, value: string) {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      <div className="card card-p" style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Users size={22} />
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{threshold} of {total} needed</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
            Any {threshold} of your {total} members can together rebuild the key. Fewer reveal nothing.
          </p>
        </div>
      </div>

      {!shareSet ? (
        <>
          <p className="form-hint" style={{ margin: '0 0 12px' }}>
            This generates one secret share per member. Give each person their own share to store
            safely — like the recovery phrase. ARKHIVE never keeps a copy.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setShareSet(generateFamilyShares())}>
            <KeyRound size={16} style={{ marginRight: 8 }} /> Generate recovery shares
          </button>
        </>
      ) : (
        <>
          <div style={{ background: 'rgba(245,166,35,0.12)', border: '1.5px solid var(--warning)', borderRadius: 12, padding: 14, display: 'flex', gap: 10, marginBottom: 16 }}>
            <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Send each share to the right person now — this is the only time they're shown. Never
              store two shares in the same place.
            </p>
          </div>
          {shareSet.shares.map(s => (
            <div key={s.memberId} className="card card-p" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{s.memberName}</p>
                <button type="button" className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => copy(s.memberId, s.share)}>
                  {copied === s.memberId ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy share</>}
                </button>
              </div>
              <code style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all', lineHeight: 1.5 }}>{s.share}</code>
            </div>
          ))}
        </>
      )}
    </>
  )
}

function RestoreTab({ threshold }: { threshold: number }) {
  const [inputs, setInputs] = useState<string[]>(['', ''])
  const [result, setResult] = useState<'ok' | 'fail' | null>(null)

  function setAt(i: number, v: string) {
    setInputs(prev => prev.map((x, j) => (j === i ? v : x)))
    setResult(null)
  }

  const provided = inputs.filter(s => s.trim()).length

  return (
    <>
      <p className="form-hint" style={{ margin: '0 0 12px' }}>
        Paste at least {threshold} members' shares to rebuild the key. This checks the shares against
        your current key — a safe way to confirm your backup works.
      </p>
      {inputs.map((val, i) => (
        <div key={i} className="form-field">
          <label className="form-label">Share {i + 1}</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: 64, fontFamily: 'monospace', fontSize: 12 }}
            value={val}
            placeholder="Paste a member's share…"
            onChange={e => setAt(i, e.target.value)}
            autoCorrect="off" autoCapitalize="none" spellCheck={false}
          />
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setInputs(prev => [...prev, ''])}>
        + Add another share
      </button>

      {result === 'ok' && (
        <div className="card card-p" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, border: '1.5px solid var(--success)' }}>
          <ShieldCheck size={18} color="var(--success)" />
          <p style={{ fontSize: 14, color: 'var(--success)', fontWeight: 600 }}>Shares verified — they rebuild your family key.</p>
        </div>
      )}
      {result === 'fail' && (
        <div className="card card-p" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, border: '1.5px solid var(--danger)' }}>
          <AlertTriangle size={18} color="var(--danger)" />
          <p style={{ fontSize: 14, color: 'var(--danger)', fontWeight: 600 }}>These shares did not rebuild the key. Check you pasted the right ones.</p>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        disabled={provided < threshold}
        onClick={() => setResult(verifySharesReconstructKey(inputs) ? 'ok' : 'fail')}
      >
        Verify shares
      </button>
      {provided < threshold && (
        <p className="form-hint" style={{ textAlign: 'center', marginTop: 8 }}>
          {provided}/{threshold} shares entered
        </p>
      )}
    </>
  )
}
