import { useState, useCallback } from 'react'
import { Plus, AlertTriangle, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getFamily } from '../family/familyStore'
import { getPolicies, addPolicy, deletePolicy, isPolicyExpiringSoon } from '../modules/insurance/store'
import type { InsurancePolicy, PolicyInput, PolicyType, PremiumCycle } from '../modules/insurance/types'
import { POLICY_TYPES } from '../modules/insurance/types'
import { getEntities } from '../modules/owners/store'
import type { Owner, SharingTier } from '../modules/owners/types'
import { addReminder } from '../reminders/engine'
import { logEvent } from '../sync/relayClient'
import { loadEntitlement, isManagedRelayActive } from '../payments/subscription'

const RELAY_URL = (import.meta.env.VITE_RELAY_URL as string | undefined) ?? ''

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function PolicyCard({
  policy,
  holderLabel,
  onDelete,
  onRenew,
}: {
  policy: InsurancePolicy
  holderLabel?: string
  onDelete: () => void
  onRenew: () => void
}) {
  const { t } = useTranslation()
  const expiringSoon = isPolicyExpiringSoon(policy)
  const expired = new Date(policy.expiryDate) < new Date()

  return (
    <div className="card card-p" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {policy.insurer}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {t(`insurance.${policy.policyType}`)} · {policy.policyNumber}
          </p>
          {holderLabel && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Held by: {holderLabel}
            </p>
          )}
          <p style={{ fontSize: 12, color: expired ? 'var(--danger)' : expiringSoon ? 'var(--warning)' : 'var(--text-muted)', marginTop: 4 }}>
            {t('insurance.expiry')}: {formatDate(policy.expiryDate)}
            {expired && ' ⚠ Expired'}
            {!expired && expiringSoon && ' ⚠'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onRenew}
            style={{
              background: 'var(--accent-bg)', border: 'none', borderRadius: 8,
              color: 'var(--accent)', fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer',
            }}
          >
            {t('insurance.renew')}
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('insurance.sum_insured')}</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>₹{policy.sumInsured.toLocaleString()}</p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('insurance.premium')}</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            ₹{policy.premium.toLocaleString()} / {t(`insurance.${policy.premiumCycle}`)}
          </p>
        </div>
      </div>
    </div>
  )
}

function AddPolicyModal({ familyId, memberId, onClose }: { familyId: string; memberId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    insurer: '',
    policyNumber: '',
    policyType: 'health' as PolicyType,
    // Policyholder encoded as `person:<memberId>` or `entity:<entityId>`; defaults to self.
    policyholder: `person:${memberId}`,
    sumInsured: '',
    premium: '',
    premiumCycle: 'yearly' as PremiumCycle,
    startDate: '',
    expiryDate: '',
    notes: '',
  })

  // Policyholder options: every family member (Person) plus every Entity (HUF, company, …).
  const family = getFamily()
  const entities = getEntities(familyId)
  const ownerOptions = [
    ...(family?.members ?? []).map(m => ({ value: `person:${m.memberId}`, label: m.name })),
    ...entities.map(e => ({ value: `entity:${e.entityId}`, label: `${e.name} (entity)` })),
  ]

  const handleSubmit = useCallback(() => {
    if (!form.insurer || !form.policyNumber || !form.expiryDate) return

    // Resolve the selected policyholder into an Owner + a default sharing tier. memberId stays
    // set (legacy field) to the holder when a Person, or the current member as a fallback.
    const [kind, id] = form.policyholder.split(':')
    let policyholder: Owner
    let holderMemberId = memberId
    let sharingTier: SharingTier = 'self'
    if (kind === 'entity') {
      policyholder = { kind: 'entity', entityId: id }
      sharingTier = getEntities(familyId).find(e => e.entityId === id)?.defaultTier ?? 'family'
    } else {
      policyholder = { kind: 'person', memberId: id }
      holderMemberId = id
    }

    const input: PolicyInput = {
      familyId,
      memberId: holderMemberId,
      insurer: form.insurer,
      policyNumber: form.policyNumber,
      policyType: form.policyType,
      policyholder,
      sharingTier,
      sumInsured: parseFloat(form.sumInsured) || 0,
      premium: parseFloat(form.premium) || 0,
      premiumCycle: form.premiumCycle,
      startDate: form.startDate || new Date().toISOString().slice(0, 10),
      expiryDate: form.expiryDate,
      notes: form.notes || undefined,
    }
    const policy = addPolicy(input)
    // Auto-create insurance_renewal reminder 30 days before expiry
    const dueDate = new Date(policy.expiryDate)
    dueDate.setDate(dueDate.getDate() - 30)
    addReminder({
      familyId,
      memberId,
      type: 'insurance_renewal',
      title: `${policy.insurer} renewal`,
      dueDate: dueDate.toISOString().slice(0, 10),
      advanceNoticeDays: 7,
      recurrence: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      linkedDocumentId: undefined,
    })
    onClose()
  }, [form, familyId, memberId, onClose])

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
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{t('insurance.add_policy')}</p>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {field(t('insurance.insurer'), 'insurer')}
        {field(t('insurance.policy_number'), 'policyNumber')}
        {field(t('insurance.policy_type'), 'policyType', 'text',
          POLICY_TYPES.map(tp => ({ value: tp, label: t(`insurance.${tp}`) }))
        )}
        {field('Policyholder', 'policyholder', 'text', ownerOptions)}
        {field(t('insurance.sum_insured'), 'sumInsured', 'number')}
        {field(t('insurance.premium'), 'premium', 'number')}
        {field(t('insurance.premium_cycle'), 'premiumCycle', 'text', [
          { value: 'monthly', label: t('insurance.monthly') },
          { value: 'quarterly', label: t('insurance.quarterly') },
          { value: 'yearly', label: t('insurance.yearly') },
        ])}
        {field(t('insurance.start_date'), 'startDate', 'date')}
        {field(t('insurance.expiry'), 'expiryDate', 'date')}
        {field(t('common.notes'), 'notes')}
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 8 }}
          onClick={handleSubmit}
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  )
}

export function InsuranceScreen() {
  const { t } = useTranslation()
  const family = getFamily()
  const [showAdd, setShowAdd] = useState(false)
  const [, setRefresh] = useState(0)

  const ent = loadEntitlement()

  const handleRenew = useCallback(() => {
    if (!family) return
    if (isManagedRelayActive(ent) && RELAY_URL && family.relayDeviceToken) {
      void logEvent(RELAY_URL, family.relayDeviceToken, 'renew_clicked', family.familyId)
    }
    alert(t('insurance.renew_coming_soon'))
  }, [ent, family, t])

  const handleDelete = useCallback((policyId: string) => {
    deletePolicy(policyId)
    setRefresh(n => n + 1)
  }, [])

  if (!family) return null

  const myMember = family.members.find(m => m.memberId === family.myMemberId)
  const isFinAdmin = myMember?.isFinancialAdmin ?? family.role === 'admin'

  const policies = getPolicies(family.familyId)
  const entities = getEntities(family.familyId)
  const members = family.members

  // Resolve a policy's Owner (Person or Entity) to a display name for the card.
  function holderLabelFor(policy: InsurancePolicy): string | undefined {
    const owner = policy.policyholder
    if (!owner) return undefined
    if (owner.kind === 'entity') return entities.find(e => e.entityId === owner.entityId)?.name
    return members.find(m => m.memberId === owner.memberId)?.name
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">{t('insurance.title')}</p>
          <p className="screen-subtitle">{t('insurance.subtitle')}</p>
        </div>
        {isFinAdmin && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            style={{ background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} />
          </button>
        )}
      </header>

      <div className="screen-body">
        {!isFinAdmin && (
          <div className="card card-p" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={16} color="var(--warning)" />
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('insurance.financial_admin_only')}</p>
          </div>
        )}

        {policies.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <Shield size={40} color="var(--text-muted)" />
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>{t('insurance.no_policies')}</p>
            {isFinAdmin && (
              <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
                <Plus size={16} style={{ marginRight: 6 }} />{t('insurance.add_policy')}
              </button>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            {policies.map(p => (
              <PolicyCard key={p.policyId} policy={p} holderLabel={holderLabelFor(p)} onDelete={() => handleDelete(p.policyId)} onRenew={handleRenew} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddPolicyModal
          familyId={family.familyId}
          memberId={family.myMemberId}
          onClose={() => { setShowAdd(false); setRefresh(n => n + 1) }}
        />
      )}
    </main>
  )
}

