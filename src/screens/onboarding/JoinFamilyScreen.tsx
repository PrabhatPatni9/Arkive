import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, ShieldCheck, AlertTriangle } from 'lucide-react'
import {
  createJoinRequest,
  completeJoin,
  deriveHandshakeCode,
  getPendingJoin,
} from '../../family/familyStore'
import type { JoinApproval, PendingJoin } from '../../family/familyStore'

type Step = 'name' | 'share_request' | 'paste_approval' | 'verify_code'

export function JoinFamilyScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('name')
  const [myName, setMyName] = useState('')
  const [pending, setPending] = useState<PendingJoin | null>(() => getPendingJoin())
  const [approvalJson, setApprovalJson] = useState('')
  const [approval, setApproval] = useState<JoinApproval | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  function handleGenerateRequest() {
    if (!myName.trim()) { setError('Please enter your name'); return }
    setError('')
    const pj = createJoinRequest(myName.trim())
    setPending(pj)
    setStep('share_request')
  }

  function copyRequest() {
    if (!pending) return
    navigator.clipboard.writeText(JSON.stringify(pending.request, null, 2)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleParseApproval() {
    setError('')
    try {
      const parsed = JSON.parse(approvalJson.trim()) as JoinApproval
      if (!parsed.wrappedFamilyKey || !parsed.adminEncPublicKey || !parsed.familyKeyId) {
        setError('Invalid approval code — are you sure you copied the full JSON?')
        return
      }
      const code = deriveHandshakeCode(pending!.request.deviceEncPublicKey, parsed.adminEncPublicKey)
      setApproval(parsed)
      setVerificationCode(code)
      setStep('verify_code')
    } catch {
      setError('Could not parse approval — check that you copied the full text')
    }
  }

  function handleCompleteJoin() {
    if (!pending || !approval) return
    setError('')
    setJoining(true)
    try {
      completeJoin(pending, approval)
      navigate('/home', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Join failed — verification may have failed')
      setJoining(false)
    }
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" type="button" onClick={() => navigate('/onboarding')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="screen-title">Join Family</p>
            <p className="screen-subtitle">
              {step === 'name' ? 'Step 1 — Your details'
                : step === 'share_request' ? 'Step 2 — Share your join request'
                : step === 'paste_approval' ? 'Step 3 — Paste the approval'
                : 'Step 4 — Verify the code'}
            </p>
          </div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        {/* Step 1: Name */}
        {step === 'name' && (
          <>
            <div className="card card-p" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                Your name
              </label>
              <input
                type="text"
                value={myName}
                onChange={e => setMyName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                style={inputStyle}
                autoFocus
                maxLength={60}
              />
            </div>
            {error && <p className="text-danger" style={{ fontSize: 14, marginBottom: 8 }}>{error}</p>}
            <button className="btn btn-primary" type="button" onClick={handleGenerateRequest}>
              Generate Join Request
            </button>
          </>
        )}

        {/* Step 2: Share request */}
        {step === 'share_request' && pending && (
          <>
            <div className="card card-p" style={{ background: 'var(--accent-bg)', marginBottom: 12, border: '1px solid var(--accent)' }}>
              <p style={{ fontSize: 13, color: 'var(--accent)', lineHeight: 1.5 }}>
                Send this join request to your family admin. They will generate an approval code for you to paste in step 3.
              </p>
            </div>

            <div className="card card-p" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Your join request</p>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ minHeight: 30, padding: '0 10px', fontSize: 12 }}
                  onClick={copyRequest}
                >
                  {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <pre style={{
                fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)',
                borderRadius: 8, padding: 12, overflow: 'auto', maxHeight: 180,
                fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {JSON.stringify(pending.request, null, 2)}
              </pre>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Send this via WhatsApp, SMS, or show it on screen for the admin to paste.
              </p>
            </div>

            <button className="btn btn-primary" type="button" onClick={() => setStep('paste_approval')}>
              Admin has approved — paste the approval
            </button>
          </>
        )}

        {/* Step 3: Paste approval */}
        {step === 'paste_approval' && (
          <>
            <div className="card card-p" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                Paste the approval code from your admin
              </label>
              <textarea
                value={approvalJson}
                onChange={e => setApprovalJson(e.target.value)}
                placeholder='Paste the JSON approval here...'
                style={{
                  ...inputStyle, resize: 'vertical', minHeight: 140,
                  fontSize: 12, fontFamily: 'monospace',
                }}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            {error && <p className="text-danger" style={{ fontSize: 14, marginBottom: 8 }}>{error}</p>}
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleParseApproval}
              disabled={!approvalJson.trim()}
            >
              Verify Approval
            </button>
          </>
        )}

        {/* Step 4: Verify code */}
        {step === 'verify_code' && approval && (
          <>
            <div className="card card-p" style={{ marginBottom: 12, textAlign: 'center' }}>
              <ShieldCheck size={32} color="var(--accent)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Compare this 6-digit code with what the admin sees on their screen. If they match, your connection is secure.
              </p>
              <div style={{
                fontSize: 42, fontWeight: 800, letterSpacing: 8,
                color: 'var(--text)', background: 'var(--bg)',
                borderRadius: 14, padding: '20px 24px',
                border: '1.5px solid var(--border)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {verificationCode}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                Joining: <strong>{approval.familyName}</strong>
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 166, 35, 0.12)',
              border: '1.5px solid var(--warning)',
              borderRadius: 12, padding: 14,
              display: 'flex', gap: 10, marginBottom: 16,
            }}>
              <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Only confirm if the code on YOUR screen matches exactly what the admin sees on THEIR screen. A mismatch means someone is intercepting the handshake.
              </p>
            </div>

            {error && <p className="text-danger" style={{ fontSize: 14, marginBottom: 8 }}>{error}</p>}

            <button
              className="btn btn-primary"
              type="button"
              onClick={handleCompleteJoin}
              disabled={joining}
            >
              {joining ? 'Joining...' : 'Codes match — Join Family'}
            </button>

            <button
              className="btn btn-ghost"
              type="button"
              style={{ marginTop: 8 }}
              onClick={() => { setStep('paste_approval'); setApproval(null); setVerificationCode('') }}
            >
              Go back — codes don't match
            </button>
          </>
        )}
      </div>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 15,
  color: 'var(--text)',
  background: 'var(--bg)',
  outline: 'none',
}
