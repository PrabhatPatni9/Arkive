import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2, Download, AlertTriangle } from 'lucide-react'
import { DOCUMENT_TYPE_LABELS } from '../vault/types'
import { listDocuments, deleteDocument, decryptDocumentBytes } from '../vault/vaultStore'
import type { DocumentRecord } from '../vault/types'
import { getFamily } from '../family/familyStore'
import { sodium } from '../crypto/sodium'
import type { EncryptionKeypair } from '../crypto/keys'

export function VaultDocumentScreen() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()
  const family = getFamily()

  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [decryptError, setDecryptError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!docId) return
    const found = listDocuments().find(d => d.docId === docId)
    setDoc(found ?? null)
  }, [docId])

  useEffect(() => {
    if (!doc || !family) return
    setDecryptError('')

    const keypair: EncryptionKeypair = {
      publicKey: sodium.from_base64(family.deviceEncKeypair.publicKey),
      secretKey: sodium.from_base64(family.deviceEncKeypair.secretKey),
    }

    try {
      const bytes = decryptDocumentBytes(doc, keypair)
      const blob = new Blob([bytes as BlobPart], { type: doc.mimeType })
      const url = URL.createObjectURL(blob)
      setObjectUrl(url)
      return () => URL.revokeObjectURL(url)
    } catch {
      setDecryptError('Could not decrypt — this document was encrypted for a different device key.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.docId])

  function handleDelete() {
    if (!doc) return
    deleteDocument(doc.docId)
    navigate('/vault')
  }

  function handleDownload() {
    if (!objectUrl || !doc) return
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `${doc.title}.${doc.mimeType === 'application/pdf' ? 'pdf' : 'jpg'}`
    a.click()
  }

  if (!doc) {
    return (
      <main className="screen">
        <header className="screen-header" style={{ paddingTop: 20 }}>
          <button type="button" className="icon-btn" onClick={() => navigate('/vault')}>
            <ArrowLeft size={20} />
          </button>
          <p className="screen-title">Document not found</p>
        </header>
      </main>
    )
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <button type="button" className="icon-btn" onClick={() => navigate('/vault')}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <p className="screen-title" style={{ fontSize: 16 }}>{doc.title}</p>
            <p className="screen-subtitle">
              {DOCUMENT_TYPE_LABELS[doc.type]} · {doc.memberName}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={handleDownload} disabled={!objectUrl}>
            <Download size={20} />
          </button>
        </div>
      </header>

      <div className="screen-body" style={{ paddingTop: 12 }}>
        {decryptError && (
          <div className="card card-p" style={{ background: 'rgba(229,62,62,0.08)', border: '1px solid var(--danger)', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <AlertTriangle size={18} color="var(--danger)" />
              <p style={{ fontSize: 13, color: 'var(--danger)' }}>{decryptError}</p>
            </div>
          </div>
        )}

        {/* Document preview */}
        {objectUrl && doc.mimeType.startsWith('image/') && (
          <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <img src={objectUrl} alt={doc.title} style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        {objectUrl && doc.mimeType === 'application/pdf' && (
          <div style={{ marginBottom: 16 }}>
            <iframe
              src={objectUrl}
              title={doc.title}
              style={{ width: '100%', height: 400, borderRadius: 12, border: '1px solid var(--border)' }}
            />
          </div>
        )}

        {/* Metadata */}
        <div className="card card-p" style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Type</p>
              <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{DOCUMENT_TYPE_LABELS[doc.type]}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>For</p>
              <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{doc.memberName}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Added</p>
              <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                {new Date(doc.createdAt).toLocaleDateString()}
              </p>
            </div>
            {doc.expiryDate && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Expires</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: new Date(doc.expiryDate) < new Date() ? 'var(--danger)' : 'var(--text)' }}>
                  {new Date(doc.expiryDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Size</p>
              <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                {(doc.sizeBytes / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
        </div>

        {doc.ocrText && (
          <div className="card card-p" style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              Scanned text
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
              {doc.ocrText}
            </p>
          </div>
        )}

        {/* Delete */}
        {!confirmDelete ? (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: 'var(--danger)', width: '100%', marginTop: 8 }}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={16} style={{ marginRight: 6 }} />
            Delete Document
          </button>
        ) : (
          <div className="card card-p" style={{ marginTop: 8, border: '1px solid var(--danger)' }}>
            <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 12, fontWeight: 600 }}>
              Delete this document? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button type="button" className="btn" style={{ flex: 1, background: 'var(--danger)', color: '#fff' }} onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
