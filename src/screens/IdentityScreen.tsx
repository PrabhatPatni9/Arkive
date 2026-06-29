import { useNavigate } from 'react-router-dom'
import { ChevronRight, FileText, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getFamily } from '../family/familyStore'
import { listDocuments } from '../vault/vaultStore'
import { DOCUMENT_TYPE_LABELS } from '../vault/types'

const IDENTITY_TYPES = new Set(['aadhaar', 'pan', 'passport', 'driving_licence'])

function formatDate(d: string | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function IdentityScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const family = getFamily()

  if (!family) return null

  const myMember = family.members.find(m => m.memberId === family.myMemberId)
  const allDocs = listDocuments()

  // Group identity documents by member
  const byMember = family.members.map(member => {
    const docs = allDocs.filter(
      d => d.memberId === member.memberId && IDENTITY_TYPES.has(d.type)
    )
    return { member, docs }
  }).filter(({ docs }) => docs.length > 0 || family.members.length <= 3)

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">{t('identity.title')}</p>
          <p className="screen-subtitle">{t('identity.subtitle')}</p>
        </div>
        <User size={24} color="var(--accent)" />
      </header>

      <div className="screen-body">
        {/* Quick access — my identity docs */}
        {myMember && (
          <div style={{ marginTop: 16 }}>
            <p className="settings-group-label">{myMember.name}</p>
            {allDocs
              .filter(d => d.memberId === family.myMemberId && IDENTITY_TYPES.has(d.type))
              .map(doc => {
                const expired = doc.expiryDate ? new Date(doc.expiryDate) < new Date() : false
                return (
                  <button
                    key={doc.docId}
                    className="settings-row"
                    type="button"
                    onClick={() => navigate(`/vault/doc/${doc.docId}`)}
                  >
                    <span className="settings-row-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={16} aria-hidden />
                      {doc.title || DOCUMENT_TYPE_LABELS[doc.type]}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {doc.expiryDate && (
                        <span style={{ fontSize: 12, color: expired ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {expired ? 'Expired' : formatDate(doc.expiryDate)}
                        </span>
                      )}
                      <ChevronRight size={17} style={{ color: 'var(--text-muted)' }} aria-hidden />
                    </span>
                  </button>
                )
              })}
            {allDocs.filter(d => d.memberId === family.myMemberId && IDENTITY_TYPES.has(d.type)).length === 0 && (
              <div className="card card-p" style={{ textAlign: 'center', padding: '24px 16px' }}>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{t('identity.no_docs')}</p>
                <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/vault/capture')}>
                  {t('vault.add_document')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Other members */}
        {byMember
          .filter(({ member }) => member.memberId !== family.myMemberId)
          .filter(({ docs }) => docs.length > 0)
          .map(({ member, docs }) => (
            <div key={member.memberId} style={{ marginTop: 16 }}>
              <p className="settings-group-label">{member.name}</p>
              {docs.map(doc => {
                const expired = doc.expiryDate ? new Date(doc.expiryDate) < new Date() : false
                return (
                  <button
                    key={doc.docId}
                    className="settings-row"
                    type="button"
                    onClick={() => navigate(`/vault/doc/${doc.docId}`)}
                  >
                    <span className="settings-row-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={16} aria-hidden />
                      {doc.title || DOCUMENT_TYPE_LABELS[doc.type]}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {doc.expiryDate && (
                        <span style={{ fontSize: 12, color: expired ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {expired ? 'Expired' : formatDate(doc.expiryDate)}
                        </span>
                      )}
                      <ChevronRight size={17} style={{ color: 'var(--text-muted)' }} aria-hidden />
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
      </div>
    </main>
  )
}
