import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Baby } from 'lucide-react'
import { createDependentMember, getFamily } from '../family/familyStore'

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

export function AddDependentScreen() {
  const navigate = useNavigate()
  const family = getFamily()

  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [allergies, setAllergies] = useState('')
  const [conditions, setConditions] = useState('')
  const [medications, setMedications] = useState('')
  const [error, setError] = useState('')

  if (!family || family.role !== 'admin') {
    navigate('/family', { replace: true })
    return null
  }

  function handleAdd() {
    if (!name.trim()) { setError('Please enter a name'); return }
    setError('')
    createDependentMember({
      name: name.trim(),
      dateOfBirth: dob || undefined,
      bloodGroup: bloodGroup.trim() || undefined,
      allergies: allergies.trim() || undefined,
      conditions: conditions.trim() || undefined,
      medications: medications.trim() || undefined,
    })
    navigate('/family', { replace: true })
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" type="button" onClick={() => navigate('/family')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="screen-title">Add Dependent</p>
            <p className="screen-subtitle">Child, elder, or anyone without their own device</p>
          </div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 12 }}>
        <div
          style={{
            background: 'var(--accent-bg)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 16,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <Baby size={18} color="var(--accent)" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Dependents are managed by admins. Their health data is stored locally and always offline-readable.
          </p>
        </div>

        {/* Required */}
        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
            Full name <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Aarav Sharma"
            style={inputStyle}
            maxLength={60}
            autoFocus
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
            Date of birth
          </label>
          <input
            type="date"
            value={dob}
            onChange={e => setDob(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Health fields — optional */}
        <p className="section-header" style={{ marginTop: 8, marginBottom: 8 }}>Health info (optional)</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Shown in Emergency Access. Add now or fill in later via the member's emergency card.
        </p>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
            Blood group
          </label>
          <input
            type="text"
            value={bloodGroup}
            onChange={e => setBloodGroup(e.target.value)}
            placeholder="e.g. B+"
            style={inputStyle}
            maxLength={10}
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
            Allergies
          </label>
          <textarea
            value={allergies}
            onChange={e => setAllergies(e.target.value)}
            placeholder="e.g. Penicillin, peanuts"
            style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
            Medical conditions
          </label>
          <textarea
            value={conditions}
            onChange={e => setConditions(e.target.value)}
            placeholder="e.g. Asthma, Type 1 diabetes"
            style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
            Current medications
          </label>
          <textarea
            value={medications}
            onChange={e => setMedications(e.target.value)}
            placeholder="e.g. Salbutamol inhaler 100mcg"
            style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
          />
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 8, padding: '0 4px' }}>{error}</p>
        )}

        <button className="btn btn-primary" type="button" onClick={handleAdd} style={{ marginTop: 8 }}>
          Add to Family
        </button>
      </div>
    </main>
  )
}
