import { useState, useCallback } from 'react'
import { Plus, Phone, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getFamily } from '../family/familyStore'
import { getContacts, addContact, deleteContact } from '../modules/contacts/store'
import type { Contact, ContactInput, ContactCategory } from '../modules/contacts/types'

const CATEGORIES: ContactCategory[] = ['doctor', 'plumber', 'electrician', 'mechanic', 'lawyer', 'school', 'other']

function ContactCard({ contact, onDelete }: { contact: Contact; onDelete: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="card card-p" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{contact.name}</p>
          <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>{t(`contacts.${contact.category}`)}</p>
          {contact.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{contact.notes}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href={`tel:${contact.phone}`}
            style={{ background: 'var(--accent-bg)', borderRadius: 8, padding: '6px 10px', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}
          >
            <Phone size={13} />{contact.phone}
          </a>
          <button type="button" onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
        </div>
      </div>
    </div>
  )
}

function AddContactModal({ familyId, onClose }: { familyId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', category: 'doctor' as ContactCategory, phone: '', email: '', notes: '' })

  const handleSubmit = useCallback(() => {
    if (!form.name || !form.phone) return
    const input: ContactInput = {
      familyId,
      name: form.name,
      category: form.category,
      phone: form.phone,
      email: form.email || undefined,
      notes: form.notes || undefined,
    }
    addContact(input)
    onClose()
  }, [form, familyId, onClose])

  const field = (label: string, key: keyof typeof form, type = 'text', options?: { value: string; label: string }[]) => (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {options ? (
        <select
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }}
        />
      )}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: '16px 16px 0 0', padding: 20, width: '100%', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{t('contacts.add_contact')}</p>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {field(t('contacts.name'), 'name')}
        {field(t('contacts.category'), 'category', 'text', CATEGORIES.map(c => ({ value: c, label: t(`contacts.${c}`) })))}
        {field(t('contacts.phone'), 'phone', 'tel')}
        {field(t('common.email'), 'email', 'email')}
        {field(t('common.notes'), 'notes')}
        <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit}>
          {t('common.save')}
        </button>
      </div>
    </div>
  )
}

export function ContactsScreen() {
  const { t } = useTranslation()
  const family = getFamily()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<ContactCategory | 'all'>('all')
  const [, setRefresh] = useState(0)

  if (!family) return null

  const allContacts = getContacts(family.familyId)
  const contacts = filter === 'all' ? allContacts : allContacts.filter(c => c.category === filter)

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">{t('contacts.title')}</p>
          <p className="screen-subtitle">{t('contacts.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          style={{ background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', cursor: 'pointer' }}
        >
          <Plus size={16} />
        </button>
      </header>

      <div className="screen-body">
        {/* Category filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 12, paddingBottom: 4 }}>
          {(['all', ...CATEGORIES] as const).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              style={{
                background: filter === cat ? 'var(--accent)' : 'var(--card-bg)',
                color: filter === cat ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {cat === 'all' ? t('common.all') : t(`contacts.${cat}`)}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          {contacts.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <BookOpen size={40} color="var(--text-muted)" />
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>{t('contacts.no_contacts')}</p>
              <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
                <Plus size={16} style={{ marginRight: 6 }} />{t('contacts.add_contact')}
              </button>
            </div>
          ) : (
            contacts.map(c => (
              <ContactCard key={c.contactId} contact={c} onDelete={() => { deleteContact(c.contactId); setRefresh(n => n + 1) }} />
            ))
          )}
        </div>
      </div>

      {showAdd && (
        <AddContactModal familyId={family.familyId} onClose={() => { setShowAdd(false); setRefresh(n => n + 1) }} />
      )}
    </main>
  )
}
