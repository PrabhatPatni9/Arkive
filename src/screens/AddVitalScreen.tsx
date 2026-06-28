import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getFamily } from '../family/familyStore'
import { addVital } from '../medical/medicalStore'
import type { VitalType } from '../medical/types'
import { VITAL_LABELS, VITAL_UNITS } from '../medical/types'

const VITAL_TYPES: VitalType[] = ['bp', 'blood_sugar', 'weight', 'spo2', 'heart_rate', 'temperature']

export function AddVitalScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const family = getFamily()

  const defaultMemberId = params.get('memberId') ?? family?.myMemberId ?? ''

  const [memberId, setMemberId] = useState(defaultMemberId)
  const [type, setType] = useState<VitalType>('bp')
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  if (!family) return null
  const members = family.members
  const selectedMember = members.find(m => m.memberId === memberId)

  const unit = VITAL_UNITS[type]
  const placeholder = type === 'bp' ? '120/80' : type === 'temperature' ? '37.0' : '98'

  function handleSave() {
    if (!value.trim()) { setError('Value is required'); return }
    if (type === 'bp' && !/^\d+\/\d+$/.test(value.trim())) {
      setError('Blood pressure should be in format 120/80')
      return
    }
    addVital({
      memberId,
      memberName: selectedMember?.name ?? 'Unknown',
      type,
      value: value.trim(),
      unit,
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
          <p className="screen-title">Log Vital</p>
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
          <label className="form-label">Vital type</label>
          <select className="form-input" value={type} onChange={e => setType(e.target.value as VitalType)}>
            {VITAL_TYPES.map(t => <option key={t} value={t}>{VITAL_LABELS[t]}</option>)}
          </select>
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label className="form-label">Value ({unit})</label>
          <input
            className="form-input"
            type={type === 'bp' ? 'text' : 'number'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            inputMode={type === 'bp' ? 'text' : 'decimal'}
            autoFocus
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 16 }}>
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Fasting, post-meal, etc."
          />
        </div>

        {error && <p className="text-danger" style={{ fontSize: 14, marginBottom: 8 }}>{error}</p>}

        <button className="btn btn-primary" type="button" onClick={handleSave} style={{ width: '100%' }}>
          Save
        </button>
      </div>
    </main>
  )
}
