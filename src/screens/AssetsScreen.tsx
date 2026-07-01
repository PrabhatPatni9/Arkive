import { useState, useCallback } from 'react'
import { Plus, Package } from 'lucide-react'
import { getFamily } from '../family/familyStore'
import { getAssets, addAsset, deleteAsset } from '../modules/assets/store'
import { ASSET_TYPES, ASSET_TYPE_LABELS } from '../modules/assets/types'
import type { Asset, AssetInput, AssetType } from '../modules/assets/types'
import { getEntities } from '../modules/owners/store'
import type { Owner, SharingTier } from '../modules/owners/types'

function AssetCard({ asset, ownerLabel, onDelete }: { asset: Asset; ownerLabel?: string; onDelete: () => void }) {
  const meta = [
    ASSET_TYPE_LABELS[asset.assetType],
    asset.identifier,
    asset.location,
  ].filter(Boolean).join(' · ')

  return (
    <div className="card card-p" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{asset.name}</p>
          <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>{meta}</p>
          {ownerLabel && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Owner: {ownerLabel}</p>}
          {typeof asset.value === 'number' && asset.value > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>₹{asset.value.toLocaleString()}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
          aria-label="Delete asset"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function AddAssetModal({ familyId, defaultOwner, onClose }: { familyId: string; defaultOwner: string; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    assetType: 'vehicle' as AssetType,
    owner: defaultOwner,       // `person:<id>` | `entity:<id>`
    identifier: '',
    value: '',
    location: '',
    warrantyExpiry: '',
  })

  const family = getFamily()
  const entities = getEntities(familyId)
  const ownerOptions = [
    ...(family?.members ?? []).map(m => ({ value: `person:${m.memberId}`, label: m.name })),
    ...entities.map(e => ({ value: `entity:${e.entityId}`, label: `${e.name} (entity)` })),
  ]

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) return
    const [kind, id] = form.owner.split(':')
    let owner: Owner
    let sharingTier: SharingTier = 'self'
    if (kind === 'entity') {
      owner = { kind: 'entity', entityId: id }
      sharingTier = getEntities(familyId).find(e => e.entityId === id)?.defaultTier ?? 'family'
    } else {
      owner = { kind: 'person', memberId: id }
    }
    const input: AssetInput = {
      familyId,
      assetType: form.assetType,
      name: form.name.trim(),
      owner,
      sharingTier,
      identifier: form.identifier.trim() || undefined,
      value: form.value ? parseFloat(form.value) : undefined,
      location: form.location.trim() || undefined,
      warrantyExpiry: form.warrantyExpiry || undefined,
      linkedPolicyIds: [],
    }
    addAsset(input)
    onClose()
  }, [form, familyId, onClose])

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box',
  }

  const select = (label: string, key: 'assetType' | 'owner', options: { value: string; label: string }[]) => (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  const field = (label: string, key: 'name' | 'identifier' | 'value' | 'location' | 'warrantyExpiry', type = 'text', placeholder?: string) => (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <input type={type} value={form[key]} placeholder={placeholder} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: '16px 16px 0 0', padding: 20, width: '100%', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Add asset</p>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {field('Name', 'name', 'text', 'e.g. Honda City, Flat 4B')}
        {select('Type', 'assetType', ASSET_TYPES.map(tp => ({ value: tp, label: ASSET_TYPE_LABELS[tp] })))}
        {select('Owner', 'owner', ownerOptions)}
        {field('Identifier', 'identifier', 'text', 'Reg no. / serial / survey no.')}
        {field('Value (₹)', 'value', 'number')}
        {field('Location', 'location')}
        {field('Warranty expiry', 'warrantyExpiry', 'date')}
        <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit}>Save</button>
      </div>
    </div>
  )
}

export function AssetsScreen() {
  const family = getFamily()
  const [showAdd, setShowAdd] = useState(false)
  const [, setRefresh] = useState(0)

  if (!family) return null

  const assets = getAssets(family.familyId)
  const entities = getEntities(family.familyId)
  const members = family.members

  function ownerLabelFor(asset: Asset): string | undefined {
    const owner = asset.owner
    if (owner.kind === 'entity') return entities.find(e => e.entityId === owner.entityId)?.name
    return members.find(m => m.memberId === owner.memberId)?.name
  }

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">Assets</p>
          <p className="screen-subtitle">Vehicles, property & valuables and who owns them</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          style={{ background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', cursor: 'pointer' }}
          aria-label="Add asset"
        >
          <Plus size={16} />
        </button>
      </header>

      <div className="screen-body">
        <div style={{ marginTop: 12 }}>
          {assets.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Package size={40} color="var(--text-muted)" />
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>
                No assets yet. Add a vehicle, property, or valuable and link it to an owner.
              </p>
              <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
                <Plus size={16} style={{ marginRight: 6 }} />Add asset
              </button>
            </div>
          ) : (
            assets.map(a => (
              <AssetCard key={a.assetId} asset={a} ownerLabel={ownerLabelFor(a)} onDelete={() => { deleteAsset(a.assetId); setRefresh(n => n + 1) }} />
            ))
          )}
        </div>
      </div>

      {showAdd && (
        <AddAssetModal
          familyId={family.familyId}
          defaultOwner={`person:${family.myMemberId}`}
          onClose={() => { setShowAdd(false); setRefresh(n => n + 1) }}
        />
      )}
    </main>
  )
}
