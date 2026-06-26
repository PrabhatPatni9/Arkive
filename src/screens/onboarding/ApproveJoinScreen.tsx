import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, ShieldCheck } from 'lucide-react'
import { approveJoinRequest, deriveHandshakeCode, getFamily } from '../../family/familyStore'
import type { JoinRequest, JoinApproval } from '../../family/familyStore'

type Step = 'paste_request' | 'review' | 'show_approval'

export function ApproveJoinScreen() {
  const navigate = useNavigate()
  const family = getFamily()
  const [step, setStep] = useState<Step>('paste_request')
  const [requestJson, setRequestJson] = useState('')
  const [request, setRequest] = useState<JoinRequest | null>(null)
  const [approval, setApproval] = useState<JoinApproval | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  if (!family || family.role !== 'admin') {
    return (
      <main className="screen">
        <div className="screen-body" style={{ paddingTop: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--danger)' }}>Only an admin can approve join requests.</p>
          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate(-1)} type="button">
            Go back
          </button>
        </div>
      </main>
    )
  }

  function handleParseRequest() {
    setError('')
    try {
      const parsed = JSON.parse(requestJson.trim()) as JoinRequest
      if (!parsed.deviceEncPublicKey || !parsed.requesterName || !parsed.requestId) {
        setError('Invalid join request — ask the requester to copy the full JSON')
        return
      }
      const code = deriveHandshakeCode(parsed.deviceEncPublicKey, family!.deviceEncKeypair.publicKey)
      setRequest(parsed)
      setVerificationCode(code)
      setStep('review')
    } catch {
      setError('Could not parse join request — check the copied text')
    }
  }

  function handleApprove() {
    if (!request) return
    setError('')
    try {
      const appr = approveJoinRequest(request)
      setApproval(appr)
      setStep('show_approval')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval failed')
    }
  }

  function copyApproval() {
    if (!approval) return
    navigator.clipboard.writeText(JSON.stringify(approval, null, 2)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" type="button" onClick={() => navigate('/family')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="screen-title">Approve Member</p>
            <p className="screen-subtitle">
              {step === 'paste_request' ? 'Step 1 — Paste join request'
                : step === 'review' ? 'Step 2 — Review & verify'
                : 'Step 3 — Share approval'}
            </p>
          </div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        {/* Step 1 */}
        {step === 'paste_request' && (
          <>
            <div className="card card-p" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                Paste the join request from the new member
              </label>
              <textarea
                value={requestJson}
                onChange={e => setRequestJson(e.target.value)}
                placeholder='Paste the JSON join request here...'
                style={{
                  width: '100%',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: 'var(--text)',
                  background: 'var(--bg)',
                  resize: 'vertical',
                  minHeight: 140,
                  outline: 'none',
                }}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
              />
            </div>
            {error && <p className="text-danger" style={{ fontSize: 14, marginBottom: 8 }}>{error}</p>}
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleParseRequest}
              disabled={!requestJson.trim()}
            >
              Review Request
            </button>
          </>
        )}

        {/* Step 2: Review */}
        {step === 'review' && request && (
          <>
            <div className="card card-p" style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                Join request from
              </p>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                {request.requesterName}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Device: {request.deviceId.slice(0, 12)}…
              </p>
            </div>

            <div className="card card-p" style={{ marginBottom: 12, textAlign: 'center' }}>
              <ShieldCheck size={28} color="var(--accent)" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                Ask {request.requesterName} to read out the code on their screen. It must match this:
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
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                Only approve if the codes match exactly.
              </p>
            </div>

            {error && <p className="text-danger" style={{ fontSize: 14, marginBottom: 8 }}>{error}</p>}

            <button className="btn btn-primary" type="button" onClick={handleApprove}>
              Codes match — Approve {request.requesterName}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              style={{ marginTop: 8 }}
              onClick={() => { setStep('paste_request'); setRequest(null); setVerificationCode('') }}
            >
              Deny / start over
            </button>
          </>
        )}

        {/* Step 3: Show approval */}
        {step === 'show_approval' && approval && (
          <>
            <div className="card card-p" style={{ background: 'rgba(45,155,111,0.1)', border: '1px solid var(--success)', marginBottom: 12 }}>
              <p style={{ fontSize: 14, color: 'var(--success)', fontWeight: 600 }}>
                {`${request?.requesterName} has been added to ${family.familyName}`}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Send them the approval code below to complete joining.
              </p>
            </div>

            <div className="card card-p" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Approval code</p>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ minHeight: 30, padding: '0 10px', fontSize: 12 }}
                  onClick={copyApproval}
                >
                  {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <pre style={{
                fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg)',
                borderRadius: 8, padding: 12, overflow: 'auto', maxHeight: 200,
                fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {JSON.stringify(approval, null, 2)}
              </pre>
            </div>

            <button className="btn btn-primary" type="button" onClick={() => navigate('/family')}>
              Done — back to Family
            </button>
          </>
        )}
      </div>
    </main>
  )
}
