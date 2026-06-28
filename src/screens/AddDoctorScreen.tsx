import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getFamily } from '../family/familyStore'
import { addDoctor } from '../medical/medicalStore'

export function AddDoctorScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const family = getFamily()

  const defaultMemberId = params.get('memberId') ?? family?.myMemberId ?? ''

  const [memberId, setMemberId] = useState(defaultMemberId)
  const [name, setName] = useState('')
  const [speciality, setSpeciality] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  if (!family) return null
  const members = family.members
  const selectedMember = members.find(m => m.memberId === memberId)

  function handleSave() {
    if (!name.trim()) { setError('Doctor name is required'); return }
    if (!speciality.trim()) { setError('Speciality is required'); return }
    addDoctor({
      memberId,
      memberName: selectedMember?.name ?? 'Unknown',
      name: name.trim(),
      speciality: speciality.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
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
          <p className="screen-title">Add Doctor</p>
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
          <label className="form-label">Doctor name</label>
          <input
            className="form-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Sharma"
            autoFocus
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label className="form-label">Speciality</label>
          <input
            className="form-input"
            type="text"
            value={speciality}
            onChange={e => setSpeciality(e.target.value)}
            placeholder="e.g. Cardiologist"
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label className="form-label">Phone (optional)</label>
          <input
            className="form-input"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 12 }}>
          <label className="form-label">Address (optional)</label>
          <textarea
            className="form-input"
            value={address}
            onChange={e => setAddress(e.target.value)}
            rows={2}
            placeholder="Clinic address"
          />
        </div>

        <div className="card card-p" style={{ marginBottom: 16 }}>
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {error && <p className="text-danger" style={{ fontSize: 14, marginBottom: 8 }}>{error}</p>}

        <button className="btn btn-primary" type="button" onClick={handleSave} style={{ width: '100%' }}>
          Save Doctor
        </button>
      </div>
    </main>
  )
}
