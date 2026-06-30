import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Printer, QrCode, ToggleLeft, ToggleRight } from 'lucide-react'
import { getFamily, setEmergencyCardEnabled, updateMemberProfile } from '../family/familyStore'
import type { FamilyMember } from '../family/familyStore'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  color: 'var(--text)',
  background: 'var(--bg)',
  outline: 'none',
  marginBottom: 8,
}

function FieldInput({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={INPUT_STYLE}
      />
    </div>
  )
}

export function EmergencyCardScreen() {
  const navigate = useNavigate()
  const { memberId } = useParams<{ memberId: string }>()
  const family = getFamily()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const member: FamilyMember | undefined = family?.members.find(m => m.memberId === memberId)
  const isEnabled = family?.emergencyCardEnabled[memberId ?? ''] ?? false

  const [bloodGroup, setBloodGroup] = useState(member?.bloodGroup ?? '')
  const [allergies, setAllergies] = useState(member?.allergies ?? '')
  const [conditions, setConditions] = useState(member?.conditions ?? '')
  const [medications, setMedications] = useState(member?.medications ?? '')
  const [contacts, setContacts] = useState(member?.emergencyContacts ?? '')
  const [policyNumbers, setPolicyNumbers] = useState(member?.policyNumbers ?? '')
  const [qrReady, setQrReady] = useState(false)

  const cardData = {
    name: member?.name ?? '',
    dob: member?.dateOfBirth ?? '',
    blood: bloodGroup,
    allergies,
    conditions,
    medications,
    contacts,
    policies: policyNumbers,
    generated: new Date().toLocaleDateString('en-IN'),
  }

  // Render QR to canvas when enabled
  useEffect(() => {
    const canvas = canvasRef.current
    if (!isEnabled || !canvas) return
    setQrReady(false)
    const compact = JSON.stringify(cardData)
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvas, compact, { width: 200, margin: 2 }, (err) => {
        if (!err) setQrReady(true)
      })
    }).catch(() => {
      // qrcode not installed — QR not available
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled])

  if (!family || !member) {
    return (
      <main className="screen">
        <div className="screen-body" style={{ paddingTop: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--danger)' }}>Member not found.</p>
          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate(-1)} type="button">
            Go back
          </button>
        </div>
      </main>
    )
  }

  function handleToggle() {
    if (!memberId) return
    const next = !isEnabled
    setEmergencyCardEnabled(memberId, next)
    if (next) {
      // Save the current profile data when enabling
      updateMemberProfile(memberId, { bloodGroup, allergies, conditions, medications, emergencyContacts: contacts, policyNumbers })
    }
    // Force re-render by navigating to self
    navigate(`/emergency/card/${memberId}`, { replace: true })
  }

  function handleSave() {
    if (!memberId) return
    updateMemberProfile(memberId, { bloodGroup, allergies, conditions, medications, emergencyContacts: contacts, policyNumbers })
    // Navigate up with success
    navigate('/emergency')
  }

  function handlePrint() {
    window.print()
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="icon-btn" type="button" onClick={() => navigate('/emergency')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="screen-title">Emergency Card</p>
            <p className="screen-subtitle">{member.name}</p>
          </div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        {/* Consent warning */}
        <div style={{
          background: 'rgba(245,166,35,0.1)',
          border: '1.5px solid var(--warning)',
          borderRadius: 12, padding: 14,
          display: 'flex', gap: 10, marginBottom: 16,
        }}>
          <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              This is opt-in plaintext
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              The Emergency Card contains unencrypted data by design — so paramedics and doctors can read it without an app or login. Enable it only for {member.name} if they consent.
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="card card-p" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Emergency Card</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {isEnabled ? 'Enabled — card can be printed / shared' : 'Off by default'}
              </p>
            </div>
            <button type="button" onClick={handleToggle} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              {isEnabled
                ? <ToggleRight size={40} color="var(--accent)" />
                : <ToggleLeft size={40} color="var(--text-muted)" />}
            </button>
          </div>
        </div>

        {/* Fields (always shown so users can pre-fill) */}
        <p className="section-header" style={{ marginTop: 0 }}>Health Information</p>
        <div className="card card-p" style={{ marginBottom: 12 }}>
          <FieldInput label="Blood Group" value={bloodGroup} onChange={setBloodGroup} placeholder="e.g. B+" />
          <FieldInput label="Known Allergies" value={allergies} onChange={setAllergies} placeholder="e.g. Penicillin, peanuts" />
          <FieldInput label="Chronic Conditions" value={conditions} onChange={setConditions} placeholder="e.g. Type 2 Diabetes, Hypertension" />
          <FieldInput label="Current Medications" value={medications} onChange={setMedications} placeholder="e.g. Metformin 500mg" />
        </div>

        <p className="section-header" style={{ marginTop: 0 }}>Contacts & Insurance</p>
        <div className="card card-p" style={{ marginBottom: 12 }}>
          <FieldInput label="Emergency Contacts" value={contacts} onChange={setContacts} placeholder="Name: +91 XXXXX XXXXX" />
          <FieldInput label="Insurance Policy Numbers" value={policyNumbers} onChange={setPolicyNumbers} placeholder="e.g. HDFC Health: POL123456" />
        </div>

        <button className="btn btn-outline" type="button" onClick={handleSave} style={{ marginBottom: 8 }}>
          Save Health Data
        </button>

        {/* Card preview + print (only when enabled) */}
        {isEnabled && (
          <>
            <p className="section-header">Emergency Card Preview</p>
            <div
              id="emergency-card-print"
              className="card card-p"
              style={{ marginBottom: 12, border: '2px solid var(--danger)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Medical Emergency Card
                  </p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{member.name}</p>
                  {cardData.dob && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>DOB: {cardData.dob}</p>}
                </div>
                <canvas ref={canvasRef} width={100} height={100} style={{ borderRadius: 8 }} />
              </div>

              {bloodGroup && (
                <div style={{ background: 'rgba(229,62,62,0.08)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700 }}>BLOOD GROUP: {bloodGroup}</p>
                </div>
              )}

              {allergies && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Allergies</p>
                  <p style={{ fontSize: 13, color: 'var(--text)' }}>{allergies}</p>
                </div>
              )}

              {conditions && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Conditions</p>
                  <p style={{ fontSize: 13, color: 'var(--text)' }}>{conditions}</p>
                </div>
              )}

              {medications && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Medications</p>
                  <p style={{ fontSize: 13, color: 'var(--text)' }}>{medications}</p>
                </div>
              )}

              {contacts && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Emergency Contact</p>
                  <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700 }}>{contacts}</p>
                </div>
              )}

              {policyNumbers && (
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Insurance</p>
                  <p style={{ fontSize: 13, color: 'var(--text)' }}>{policyNumbers}</p>
                </div>
              )}

              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 10 }}>
                Generated {cardData.generated} via Arkive — data consented by patient.
                {!qrReady && ' Scan QR for full data.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                type="button"
                onClick={handlePrint}
                style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}
              >
                <Printer size={16} />
                Print Card
              </button>
              {qrReady && (
                <button
                  className="btn btn-outline"
                  type="button"
                  style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => {
                    const url = canvasRef.current?.toDataURL()
                    if (url) { const a = document.createElement('a'); a.href = url; a.download = `emergency-${member.name}.png`; a.click() }
                  }}
                >
                  <QrCode size={16} />
                  Save QR
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
