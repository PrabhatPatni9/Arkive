import { useState } from 'react'
import type { DocumentCategory } from '../ocr/types'

const CATEGORIES: DocumentCategory[] = [
  'medical', 'legal', 'financial', 'identity', 'insurance', 'other',
]

export function DocumentCaptureScreen() {
  const [category, setCategory] = useState<DocumentCategory | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !category) return
    setStatus('scanning')
    try {
      const buf = await file.arrayBuffer()
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      const { createOcrService } = await import('../ocr/ocrService')
      const svc = await createOcrService()
      const result = await svc.recognize(b64)
      setOcrText(result.text || '(no text detected)')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="screen">
      <header className="screen-header">
        <h1>Add Document</h1>
      </header>
      <section className="screen-body">
        <p className="settings-section-heading">Category</p>
        <div className="vault-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`vault-category-btn${category === cat ? ' selected' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {category && (
          <>
            <label
              className="btn-secondary"
              style={{ textAlign: 'center', display: 'block', marginTop: 16 }}
            >
              {status === 'scanning' ? 'Scanning...' : 'Choose File'}
              <input
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFile}
                disabled={status === 'scanning'}
              />
            </label>

            {ocrText && (
              <div className="ocr-preview">
                <p className="settings-section-heading" style={{ marginTop: 16 }}>Detected Text</p>
                <div className="ocr-text-box">{ocrText}</div>
              </div>
            )}

            {status === 'done' && (
              <button className="btn-primary" type="button">Save Encrypted</button>
            )}

            {status === 'error' && (
              <p className="text-muted" style={{ textAlign: 'center', marginTop: 12 }}>
                Scan failed. Please try again.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  )
}
