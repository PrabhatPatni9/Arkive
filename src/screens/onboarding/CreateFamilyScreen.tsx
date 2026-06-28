import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Home } from 'lucide-react'
import { makePhrase } from '../../family/familyStore'

export function CreateFamilyScreen() {
  const navigate = useNavigate()
  const [familyName, setFamilyName] = useState('')
  const [myName, setMyName] = useState('')
  const [familyType, setFamilyType] = useState<'nuclear' | 'joint'>('nuclear')
  const [error, setError] = useState('')

  function handleContinue() {
    if (!familyName.trim()) { setError('Please enter a family name'); return }
    if (!myName.trim()) { setError('Please enter your name'); return }
    setError('')
    // Generate phrase here so it doesn't regenerate on re-render
    const phrase = makePhrase()
    navigate('/onboarding/recovery', {
      state: { familyName: familyName.trim(), myName: myName.trim(), familyType, phrase },
    })
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" type="button" onClick={() => navigate('/onboarding')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="screen-title">Create Family</p>
            <p className="screen-subtitle">Step 1 of 2 — Family details</p>
          </div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
            Family name
          </label>
          <input
            type="text"
            value={familyName}
            onChange={e => setFamilyName(e.target.value)}
            placeholder="e.g. The Sharma Family"
            style={inputStyle}
            maxLength={60}
            autoFocus
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
            Your name
          </label>
          <input
            type="text"
            value={myName}
            onChange={e => setMyName(e.target.value)}
            placeholder="e.g. Raj Sharma"
            style={inputStyle}
            maxLength={60}
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
            Family type
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`btn btn-sm${familyType === 'nuclear' ? ' btn-primary' : ' btn-ghost'}`}
              style={{ flex: 1 }}
              onClick={() => setFamilyType('nuclear')}
            >
              <Home size={15} style={{ marginRight: 6 }} />
              Nuclear
            </button>
            <button
              type="button"
              className={`btn btn-sm${familyType === 'joint' ? ' btn-primary' : ' btn-ghost'}`}
              style={{ flex: 1 }}
              onClick={() => setFamilyType('joint')}
            >
              <Users size={15} style={{ marginRight: 6 }} />
              Joint
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            {familyType === 'nuclear'
              ? 'One household — simple and private.'
              : 'Multiple sub-family households within the family vault.'}
          </p>
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 8, padding: '0 4px' }}>{error}</p>
        )}

        <button className="btn btn-primary" type="button" onClick={handleContinue} style={{ marginTop: 8 }}>
          Continue — Set Up Recovery
        </button>
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
