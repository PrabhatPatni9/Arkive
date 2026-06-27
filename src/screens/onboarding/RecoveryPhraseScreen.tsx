import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Check, Copy } from 'lucide-react'
import { createFamily, setRelayDeviceToken } from '../../family/familyStore'
import { registerWithRelay } from '../../sync/relayClient'

const RELAY_URL = (import.meta.env.VITE_RELAY_URL as string | undefined) ?? ''

interface LocationState {
  familyName: string
  myName: string
  familyType: 'nuclear' | 'joint'
  phrase: string
}

export function RecoveryPhraseScreen() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: LocationState }
  const [confirmed, setConfirmed] = useState(false)
  const [typedPhrase, setTypedPhrase] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!state?.phrase) {
    navigate('/onboarding/create', { replace: true })
    return null
  }

  const { familyName, myName, familyType, phrase } = state
  const words = phrase.split(' ')
  const phraseMatches = typedPhrase.trim() === phrase.trim()

  function copyPhrase() {
    navigator.clipboard.writeText(phrase).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCreate() {
    if (!phraseMatches) { setError('Phrase does not match. Please check carefully.'); return }
    setError('')
    setLoading(true)
    try {
      const family = createFamily({ familyName, myName, familyType, recoveryPhrase: phrase })

      // Register with relay in background — failure is non-fatal (offline still works)
      if (RELAY_URL) {
        registerWithRelay(RELAY_URL, family)
          .then(token => setRelayDeviceToken(token))
          .catch(() => {})
      }

      navigate('/home', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create family')
      setLoading(false)
    }
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" type="button" onClick={() => navigate('/onboarding/create', { state })}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="screen-title">Recovery Phrase</p>
            <p className="screen-subtitle">Step 2 of 2 — Write this down</p>
          </div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        <div style={{
          background: 'rgba(245, 166, 35, 0.12)',
          border: '1.5px solid var(--warning)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          gap: 12,
          marginBottom: 16,
        }}>
          <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              This phrase is your only backup
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {`${words.length} words generated on your device. Arkive never sees it. If you lose all your devices, this phrase is the only way to recover your vault. Write it on paper and store it safely.`}
            </p>
          </div>
        </div>

        <div className="card card-p" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Your 12-word recovery phrase</p>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={{ minHeight: 30, padding: '0 10px', fontSize: 12 }}
              onClick={copyPhrase}
            >
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {words.map((word, i) => (
              <div key={i} style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text)',
              }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                  {i + 1}
                </span>
                {word}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmed(!confirmed)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', background: 'transparent', border: 'none',
            padding: '12px 4px', cursor: 'pointer', marginBottom: 16,
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            border: `2px solid ${confirmed ? 'var(--accent)' : 'var(--border)'}`,
            background: confirmed ? 'var(--accent)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}>
            {confirmed && <Check size={14} color="white" strokeWidth={3} />}
          </div>
          <span style={{ fontSize: 14, color: 'var(--text)', textAlign: 'left', lineHeight: 1.4 }}>
            I have written down this phrase and stored it safely. I understand I cannot recover my vault without it.
          </span>
        </button>

        {confirmed && (
          <div className="card card-p" style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
              Type your phrase to confirm
            </label>
            <textarea
              value={typedPhrase}
              onChange={e => setTypedPhrase(e.target.value)}
              placeholder="Type all 12 words separated by spaces..."
              style={{
                width: '100%', border: `1.5px solid ${typedPhrase && !phraseMatches ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 14px', fontSize: 14,
                color: 'var(--text)', background: 'var(--bg)', resize: 'none',
                minHeight: 80, lineHeight: 1.5, outline: 'none',
              }}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            {typedPhrase && phraseMatches && (
              <p style={{ color: 'var(--success)', fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={14} /> Phrase matches
              </p>
            )}
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 8, padding: '0 4px' }}>{error}</p>
        )}

        <button
          className="btn btn-primary"
          type="button"
          onClick={handleCreate}
          disabled={!confirmed || !phraseMatches || loading}
          style={{ marginTop: 4 }}
        >
          {loading ? 'Creating vault...' : 'Create Family Vault'}
        </button>
      </div>
    </main>
  )
}
