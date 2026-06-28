import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Upload, Check } from 'lucide-react'
import type { DocumentType } from '../vault/types'
import { DOCUMENT_TYPE_LABELS } from '../vault/types'
import { prepareFile } from '../vault/compression'
import { saveDocument } from '../vault/vaultStore'
import { getFamily } from '../family/familyStore'
import { sodium } from '../crypto/sodium'

type Step = 'pick_type' | 'capture' | 'confirm'

const DOC_TYPES: DocumentType[] = [
  'aadhaar', 'pan', 'passport', 'driving_licence',
  'rc', 'puc', 'insurance',
  'medical_report', 'blood_report', 'prescription', 'discharge_summary', 'bill',
  'other',
]

export function DocumentCaptureScreen() {
  const navigate = useNavigate()
  const family = getFamily()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('pick_type')
  const [docType, setDocType] = useState<DocumentType | null>(null)

  // Step 2 state
  const [processing, setProcessing] = useState(false)
  const [processError, setProcessError] = useState('')
  const [preparedBytes, setPreparedBytes] = useState<Uint8Array | null>(null)
  const [preparedMime, setPreparedMime] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Step 3 state
  const [title, setTitle] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState(family?.myMemberId ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  if (!family) return null

  const members = family.members.filter(m => !m.isDependent || m.memberId === family.myMemberId
    ? true : true)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !docType) return
    setProcessing(true)
    setProcessError('')
    setOcrText('')
    setPreviewUrl(null)

    try {
      const { bytes, mimeType } = await prepareFile(file)
      setPreparedBytes(bytes)
      setPreparedMime(mimeType)

      // Show preview
      if (mimeType.startsWith('image/')) {
        const blob = new Blob([bytes], { type: mimeType })
        setPreviewUrl(URL.createObjectURL(blob))
      }

      // OCR
      try {
        const b64 = sodium.to_base64(bytes)
        const { createOcrService } = await import('../ocr/ocrService')
        const svc = await createOcrService()
        const result = await svc.recognize(b64)
        setOcrText(result.text ?? '')
      } catch { /* OCR is best-effort */ }

      // Pre-fill title from type label
      setTitle(DOCUMENT_TYPE_LABELS[docType])
      setStep('confirm')
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Failed to process file')
    } finally {
      setProcessing(false)
    }
  }

  function handleSave() {
    if (!preparedBytes || !docType || !family) return
    setSaveError('')
    setSaving(true)

    try {
      const member = family.members.find(m => m.memberId === selectedMemberId)
      const recipientPublicKey = sodium.from_base64(family.deviceEncKeypair.publicKey)

      saveDocument({
        type: docType,
        title: title.trim() || DOCUMENT_TYPE_LABELS[docType],
        scope: 'member',
        memberId: selectedMemberId,
        memberName: member?.name ?? 'Unknown',
        expiryDate: expiryDate || undefined,
        plaintext: preparedBytes,
        mimeType: preparedMime,
        ocrText,
        extractedFields: {},
        scopeKeyId: family.familyKey.keyId,
        scopeKeyEpoch: family.familyKey.epoch,
        recipientPublicKey,
      })

      navigate('/vault')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              if (step === 'confirm') setStep('capture')
              else if (step === 'capture') setStep('pick_type')
              else navigate('/vault')
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="screen-title">Add Document</p>
            <p className="screen-subtitle">
              {step === 'pick_type' ? 'Step 1 — Choose type'
                : step === 'capture' ? 'Step 2 — Upload file'
                : 'Step 3 — Confirm details'}
            </p>
          </div>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 16 }}>

        {/* Step 1: Pick type */}
        {step === 'pick_type' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DOC_TYPES.map(type => (
              <button
                key={type}
                type="button"
                className={`btn btn-sm${docType === type ? ' btn-primary' : ' btn-ghost'}`}
                onClick={() => { setDocType(type); setStep('capture') }}
              >
                {DOCUMENT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Capture */}
        {step === 'capture' && docType && (
          <>
            {processError && (
              <p className="text-danger" style={{ fontSize: 14, marginBottom: 12 }}>{processError}</p>
            )}
            <div className="card card-p" style={{ textAlign: 'center', padding: '32px 16px', marginBottom: 12 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
                Choose how to add your {DOCUMENT_TYPE_LABELS[docType]}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                  <Camera size={18} style={{ marginRight: 8 }} />
                  {processing ? 'Processing…' : 'Take Photo'}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleFile}
                    disabled={processing}
                  />
                </label>
                <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                  <Upload size={18} style={{ marginRight: 8 }} />
                  Upload File
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleFile}
                    disabled={processing}
                  />
                </label>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <>
            {previewUrl && (
              <div style={{ marginBottom: 12, borderRadius: 10, overflow: 'hidden', maxHeight: 200 }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div className="card card-p" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                Title
              </label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>

            <div className="card card-p" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                For (family member)
              </label>
              <select
                className="form-input"
                value={selectedMemberId}
                onChange={e => setSelectedMemberId(e.target.value)}
              >
                {members.map(m => (
                  <option key={m.memberId} value={m.memberId}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="card card-p" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                Expiry date (optional)
              </label>
              <input
                type="date"
                className="form-input"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
              />
            </div>

            {ocrText && (
              <div className="card card-p" style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Detected text (stored encrypted)
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto' }}>
                  {ocrText}
                </p>
              </div>
            )}

            {saveError && (
              <p className="text-danger" style={{ fontSize: 14, marginBottom: 8 }}>{saveError}</p>
            )}

            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ width: '100%' }}
            >
              <Check size={18} style={{ marginRight: 8 }} />
              {saving ? 'Saving…' : 'Save Encrypted'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
