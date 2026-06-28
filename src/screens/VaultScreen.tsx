import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, AlertTriangle, Clock } from 'lucide-react'
import type { DocumentType } from '../vault/types'
import { DOCUMENT_TYPE_LABELS } from '../vault/types'
import { listDocuments, isExpired, isExpiringSoon } from '../vault/vaultStore'
import type { DocumentRecord } from '../vault/types'

const FILTER_TYPES: Array<DocumentType | 'all'> = [
  'all', 'aadhaar', 'pan', 'passport', 'driving_licence', 'insurance',
  'medical_report', 'prescription', 'other',
]

export function VaultScreen() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<DocumentType | 'all'>('all')
  const [docs, setDocs] = useState<DocumentRecord[]>([])

  useEffect(() => {
    const all = listDocuments()
    setDocs(filter === 'all' ? all : all.filter(d => d.type === filter))
  }, [filter])

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">Vault</p>
          <p className="screen-subtitle">Encrypted family documents</p>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => navigate('/vault/capture')}
          style={{ minHeight: 36 }}
        >
          <Plus size={16} style={{ marginRight: 4 }} />
          Add
        </button>
      </header>

      <div className="screen-body" style={{ paddingTop: 12 }}>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
          {FILTER_TYPES.map(type => (
            <button
              key={type}
              type="button"
              className={`btn btn-sm${filter === type ? ' btn-primary' : ' btn-ghost'}`}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              onClick={() => setFilter(type)}
            >
              {type === 'all' ? 'All' : DOCUMENT_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <FileText size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              {filter === 'all' ? 'No documents yet.' : `No ${DOCUMENT_TYPE_LABELS[filter]} documents.`}
            </p>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => navigate('/vault/capture')}
            >
              <Plus size={16} style={{ marginRight: 6 }} />
              Add Document
            </button>
          </div>
        ) : (
          <div>
            {docs.map(doc => (
              <button
                key={doc.docId}
                type="button"
                className="card card-p"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
                  marginBottom: 10, textAlign: 'left', border: 'none', cursor: 'pointer',
                  background: 'var(--surface)', boxShadow: 'var(--shadow-card)',
                }}
                onClick={() => navigate(`/vault/doc/${doc.docId}`)}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: 'var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FileText size={20} color="var(--accent)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                    {doc.title}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {DOCUMENT_TYPE_LABELS[doc.type]} · {doc.memberName}
                  </p>
                  {doc.expiryDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      {isExpired(doc) ? (
                        <AlertTriangle size={12} color="var(--danger)" />
                      ) : isExpiringSoon(doc) ? (
                        <Clock size={12} color="var(--warning)" />
                      ) : null}
                      <p style={{
                        fontSize: 11,
                        color: isExpired(doc) ? 'var(--danger)' : isExpiringSoon(doc) ? 'var(--warning)' : 'var(--text-muted)',
                        fontWeight: isExpired(doc) || isExpiringSoon(doc) ? 600 : 400,
                      }}>
                        {isExpired(doc) ? 'Expired' : 'Expires'} {new Date(doc.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
