import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getFamily } from '../family/familyStore'
import { addMedicine } from '../medical/medicalStore'
import type { MedicineFrequency } from '../medical/types'
import { FREQUENCY_LABELS } from '../medical/types'

const FREQUENCIES: MedicineFrequency[] = ['once_daily', 'twice_daily', 'thrice_daily', 'as_needed', 'weekly']

export function AddMedicineScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const family = getFamily()

  const defaultMemberId = params.get('memberId') ?? family?.myMemberId ?? ''

  const [memberId, setMemberId] = useState(defaultMemberId)
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState<MedicineFrequency>('once_daily')
  const [timing, setTiming] = useState('after meals')
  const [ongoing, setOngoing] = useState(true)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  if (!family) return null
  const members = family.members
  const selectedMember = members.find(m => m.memberId === memberId)

  function handleSave() {
    if (!name.trim()) { setError('Medicine name is required'); return }
    if (!dosage.trim()) { setError('Dosage is required'); return }
    addMedicine({
      memberId,
      memberName: selectedMember?.name ?? 'Unknown',
      name: name.trim(),
      dosage: dosage.trim(),
      frequency,
      timing: timing.trim(),
      ongoing,
      startDate,
      endDate: ongoing ? undefined : endDate || undefined,
      notes: notes.trim() || undefined,
    })
    navigate('/medical')
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="icon-btn" onClick={() => navigate('/medical')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="screen-title">Add Medicine</p>
          </div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label className="form-label">For</label>
          <select className="form-input" value={memberId} onChange={e => setMemberId(e.target.value)}>
            {members.map(m => <option key={m.memberId} value={m.memberId}>{m.name}</option>)}
          </select>
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label className="form-label">Medicine name</label>
          <input
            className="form-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Metformin"
            autoFocus
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label className="form-label">Dosage</label>
          <input
            className="form-input"
            type="text"
            value={dosage}
            onChange={e => setDosage(e.target.value)}
            placeholder="e.g. 500mg"
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label className="form-label">Frequency</label>
          <select className="form-input" value={frequency} onChange={e => setFrequency(e.target.value as MedicineFrequency)}>
            {FREQUENCIES.map(f => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
          </select>
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label className="form-label">Timing</label>
          <input
            className="form-input"
            type="text"
            value={timing}
            onChange={e => setTiming(e.target.value)}
            placeholder="e.g. after meals, before bed"
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label className="form-label">Start date</label>
          <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Ongoing medication</label>
            <button
              type="button"
              role="switch"
              aria-checked={ongoing}
              onClick={() => setOngoing(!ongoing)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: ongoing ? 'var(--accent)' : 'var(--border)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: ongoing ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
          {!ongoing && (
            <div style={{ marginTop: 12 }}>
              <label className="form-label">End date</label>
              <input className="form-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          )}
        </div>

        <div className="card card-p" style={{ marginBottom: 16 }}>
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes"
          />
        </div>

        {error && <p className="text-danger" style={{ fontSize: 14, marginBottom: 8 }}>{error}</p>}

        <button className="btn btn-primary" type="button" onClick={handleSave} style={{ width: '100%' }}>
          Save Medicine
        </button>
      </div>
    </main>
  )
}
