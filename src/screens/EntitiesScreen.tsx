import { useState, useCallback } from 'react'
import { Plus, Building2 } from 'lucide-react'
import { getFamily } from '../family/familyStore'
import { getEntities, addEntity, deleteEntity } from '../modules/owners/store'
import {
  ENTITY_TYPE_LABELS,
  defaultTierForEntityType,
} from '../modules/owners/types'
import type { Entity, EntityInput, EntityType, SharingTier } from '../modules/owners/types'

const ENTITY_TYPES = Object.keys(ENTITY_TYPE_LABELS) as EntityType[]

const TIER_LABELS: Record<SharingTier, string> = {
  self: 'Self',
  node: 'Household',
  family: 'Whole family',
  custom: 'Custom',
}

function EntityCard({ entity, onDelete }: { entity: Entity; onDelete: () => void }) {
  const ids = [entity.pan && `PAN ${entity.pan}`, entity.gstin && `GSTIN ${entity.gstin}`, entity.cin && `CIN ${entity.cin}`]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="card card-p" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{entity.name}</p>
          <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>{ENTITY_TYPE_LABELS[entity.entityType]}</p>
          {ids && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ids}</p>}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Default sharing: {TIER_LABELS[entity.defaultTier]}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
          aria-label="Delete entity"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function AddEntityModal({ familyId, onClose }: { familyId: string; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    entityType: 'HUF' as EntityType,
    pan: '',
    gstin: '',
    cin: '',
  })

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) return
    const input: EntityInput = {
      familyId,
      entityType: form.entityType,
      name: form.name.trim(),
      pan: form.pan.trim() || undefined,
      gstin: form.gstin.trim() || undefined,
      cin: form.cin.trim() || undefined,
      linkedMemberIds: [],
      // Seed the sharing tier from the entity type; the user can change it later.
      defaultTier: defaultTierForEntityType(form.entityType),
    }
    addEntity(input)
    onClose()
  }, [form, familyId, onClose])

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box',
  }

  const field = (label: string, key: 'name' | 'pan' | 'gstin' | 'cin', placeholder?: string) => (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <input
        type="text"
        value={form[key]}
        placeholder={placeholder}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={inputStyle}
      />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: '16px 16px 0 0', padding: 20, width: '100%', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Add entity</p>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {field('Name', 'name', 'e.g. Patni HUF, Ratanmoti Texfab Pvt Ltd')}

        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Type</p>
          <select
            value={form.entityType}
            onChange={e => setForm(f => ({ ...f, entityType: e.target.value as EntityType }))}
            style={inputStyle}
          >
            {ENTITY_TYPES.map(tp => <option key={tp} value={tp}>{ENTITY_TYPE_LABELS[tp]}</option>)}
          </select>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Default sharing: {TIER_LABELS[defaultTierForEntityType(form.entityType)]} (you can change this later)
          </p>
        </div>

        {field('PAN', 'pan', 'Optional')}
        {field('GSTIN', 'gstin', 'Optional')}
        {field('CIN', 'cin', 'Optional (companies)')}

        <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit}>
          Save
        </button>
      </div>
    </div>
  )
}

export function EntitiesScreen() {
  const family = getFamily()
  const [showAdd, setShowAdd] = useState(false)
  const [, setRefresh] = useState(0)

  if (!family) return null

  const entities = getEntities(family.familyId)

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">Entities &amp; Owners</p>
          <p className="screen-subtitle">HUFs, companies & trusts that hold policies or assets</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          style={{ background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', cursor: 'pointer' }}
          aria-label="Add entity"
        >
          <Plus size={16} />
        </button>
      </header>

      <div className="screen-body">
        <div style={{ marginTop: 12 }}>
          {entities.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Building2 size={40} color="var(--text-muted)" />
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>
                No entities yet. Add a HUF, company, or trust to hold insurance policies and assets.
              </p>
              <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
                <Plus size={16} style={{ marginRight: 6 }} />Add entity
              </button>
            </div>
          ) : (
            entities.map(e => (
              <EntityCard
                key={e.entityId}
                entity={e}
                onDelete={() => { deleteEntity(e.entityId); setRefresh(n => n + 1) }}
              />
            ))
          )}
        </div>
      </div>

      {showAdd && (
        <AddEntityModal
          familyId={family.familyId}
          onClose={() => { setShowAdd(false); setRefresh(n => n + 1) }}
        />
      )}
    </main>
  )
}
