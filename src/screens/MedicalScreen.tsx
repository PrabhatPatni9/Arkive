import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Phone } from 'lucide-react'
import { getFamily } from '../family/familyStore'
import {
  getMedicinesByMember,
  getVitalsByMember,
  getDoctorsByMember,
  deleteMedicine,
  deleteVital,
  deleteDoctor,
} from '../medical/medicalStore'
import type { Medicine, Vital, Doctor } from '../medical/types'
import { VITAL_LABELS, FREQUENCY_LABELS } from '../medical/types'

type Tab = 'medicines' | 'vitals' | 'doctors'

export function MedicalScreen() {
  const navigate = useNavigate()
  const family = getFamily()

  const [tab, setTab] = useState<Tab>('medicines')
  const [selectedMemberId, setSelectedMemberId] = useState(family?.myMemberId ?? '')
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [vitals, setVitals] = useState<Vital[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])

  const members = family?.members ?? []
  const selectedMember = members.find(m => m.memberId === selectedMemberId)

  useEffect(() => {
    if (!selectedMemberId) return
    setMedicines(getMedicinesByMember(selectedMemberId))
    setVitals(getVitalsByMember(selectedMemberId))
    setDoctors(getDoctorsByMember(selectedMemberId))
  }, [selectedMemberId, tab])

  function refresh() {
    setMedicines(getMedicinesByMember(selectedMemberId))
    setVitals(getVitalsByMember(selectedMemberId))
    setDoctors(getDoctorsByMember(selectedMemberId))
  }

  if (!family) return null

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">Medical</p>
          <p className="screen-subtitle">Health records</p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => navigate(
            tab === 'medicines' ? `/medical/add-medicine?memberId=${selectedMemberId}`
              : tab === 'vitals' ? `/medical/add-vital?memberId=${selectedMemberId}`
              : `/medical/add-doctor?memberId=${selectedMemberId}`
          )}
          style={{ minHeight: 36 }}
        >
          <Plus size={16} style={{ marginRight: 4 }} />
          Add
        </button>
      </header>

      <div className="screen-body" style={{ paddingTop: 12 }}>
        {/* Member picker */}
        {members.length > 1 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
            {members.map(m => (
              <button
                key={m.memberId}
                type="button"
                className={`btn btn-sm${selectedMemberId === m.memberId ? ' btn-primary' : ' btn-ghost'}`}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                onClick={() => setSelectedMemberId(m.memberId)}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--bg)', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
          {(['medicines', 'vitals', 'doctors'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-muted)',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Medicines tab */}
        {tab === 'medicines' && (
          <>
            {medicines.length === 0 ? (
              <EmptyState label="No medicines for" name={selectedMember?.name ?? 'this member'} />
            ) : (
              medicines.map(med => (
                <div key={med.medId} className="card card-p" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{med.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {med.dosage} · {FREQUENCY_LABELS[med.frequency]}
                      </p>
                      {med.timing && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{med.timing}</p>
                      )}
                      {med.ongoing ? (
                        <span className="section-badge" style={{ marginTop: 4 }}>Ongoing</span>
                      ) : med.endDate ? (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          Until {new Date(med.endDate).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => { deleteMedicine(med.medId); refresh() }}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Vitals tab */}
        {tab === 'vitals' && (
          <>
            {vitals.length === 0 ? (
              <EmptyState label="No vitals for" name={selectedMember?.name ?? 'this member'} />
            ) : (
              vitals.slice(0, 20).map(vital => (
                <div key={vital.vitalId} className="card card-p" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>
                        {VITAL_LABELS[vital.type]}
                      </p>
                      <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: 1 }}>
                        {vital.value} <span style={{ fontSize: 13, fontWeight: 400 }}>{vital.unit}</span>
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(vital.recordedAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => { deleteVital(vital.vitalId); refresh() }}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Doctors tab */}
        {tab === 'doctors' && (
          <>
            {doctors.length === 0 ? (
              <EmptyState label="No doctors for" name={selectedMember?.name ?? 'this member'} />
            ) : (
              doctors.map(doc => (
                <div key={doc.doctorId} className="card card-p" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Dr. {doc.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{doc.speciality}</p>
                      {doc.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Phone size={12} color="var(--accent)" />
                          <a href={`tel:${doc.phone}`} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                            {doc.phone}
                          </a>
                        </div>
                      )}
                      {doc.address && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{doc.address}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => { deleteDoctor(doc.doctorId); refresh() }}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </main>
  )
}

function EmptyState({ label, name }: { label: string; name: string }) {
  return (
    <div className="card card-p" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: 14 }}>
      {label} {name}.
    </div>
  )
}
