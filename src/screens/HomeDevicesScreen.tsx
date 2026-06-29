import { useState, useCallback } from 'react'
import { Plus, Cpu, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getFamily } from '../family/familyStore'
import { getHomeDevices, addHomeDevice, deleteHomeDevice, isWarrantyExpiringSoon } from '../modules/homedevices/store'
import type { HomeDevice, HomeDeviceInput, DeviceCategory } from '../modules/homedevices/types'

const CATEGORIES: DeviceCategory[] = ['appliance', 'electronics', 'furniture', 'tool', 'other']

function formatDate(d: string | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function DeviceCard({ device, onDelete }: { device: HomeDevice; onDelete: () => void }) {
  const { t } = useTranslation()
  const warrantyWarn = isWarrantyExpiringSoon(device)
  const warrantyExpired = device.warrantyExpiry ? new Date(device.warrantyExpiry) < new Date() : false

  return (
    <div className="card card-p" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{device.name}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {t(`home_devices.${device.category}`)}{device.brand ? ` · ${device.brand}` : ''}{device.model ? ` ${device.model}` : ''}
          </p>
          {device.warrantyExpiry && (
            <p style={{ fontSize: 12, color: warrantyExpired ? 'var(--danger)' : warrantyWarn ? 'var(--warning)' : 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              {(warrantyExpired || warrantyWarn) && <AlertTriangle size={11} />}
              {t('home_devices.warranty_expiry')}: {formatDate(device.warrantyExpiry)}
            </p>
          )}
          {device.purchaseDate && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {t('home_devices.purchase_date')}: {formatDate(device.purchaseDate)}
            </p>
          )}
        </div>
        <button type="button" onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
      </div>
    </div>
  )
}

function AddDeviceModal({ familyId, onClose }: { familyId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    name: '',
    category: 'appliance' as DeviceCategory,
    brand: '',
    model: '',
    purchaseDate: '',
    warrantyExpiry: '',
    notes: '',
  })

  const handleSubmit = useCallback(() => {
    if (!form.name) return
    const input: HomeDeviceInput = {
      familyId,
      name: form.name,
      category: form.category,
      brand: form.brand || undefined,
      model: form.model || undefined,
      purchaseDate: form.purchaseDate || undefined,
      warrantyExpiry: form.warrantyExpiry || undefined,
      notes: form.notes || undefined,
    }
    addHomeDevice(input)
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
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{t('home_devices.add_device')}</p>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {field(t('home_devices.name'), 'name')}
        {field(t('home_devices.category'), 'category', 'text', CATEGORIES.map(c => ({ value: c, label: t(`home_devices.${c}`) })))}
        {field(t('home_devices.brand'), 'brand')}
        {field(t('home_devices.model'), 'model')}
        {field(t('home_devices.purchase_date'), 'purchaseDate', 'date')}
        {field(t('home_devices.warranty_expiry'), 'warrantyExpiry', 'date')}
        {field(t('common.notes'), 'notes')}
        <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit}>
          {t('common.save')}
        </button>
      </div>
    </div>
  )
}

export function HomeDevicesScreen() {
  const { t } = useTranslation()
  const family = getFamily()
  const [showAdd, setShowAdd] = useState(false)
  const [, setRefresh] = useState(0)

  if (!family) return null

  const devices = getHomeDevices(family.familyId)
  const warnCount = devices.filter(d => isWarrantyExpiringSoon(d)).length

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">{t('home_devices.title')}</p>
          <p className="screen-subtitle">
            {devices.length > 0 ? `${devices.length} item${devices.length === 1 ? '' : 's'}` : t('home_devices.subtitle')}
            {warnCount > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--warning)' }}>
                <AlertTriangle size={12} style={{ display: 'inline', marginRight: 3 }} />{warnCount} warranty expiring
              </span>
            )}
          </p>
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
        {devices.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <Cpu size={40} color="var(--text-muted)" />
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>{t('home_devices.no_devices')}</p>
            <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
              <Plus size={16} style={{ marginRight: 6 }} />{t('home_devices.add_device')}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            {devices.map(d => (
              <DeviceCard key={d.deviceId} device={d} onDelete={() => { deleteHomeDevice(d.deviceId); setRefresh(n => n + 1) }} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddDeviceModal familyId={family.familyId} onClose={() => { setShowAdd(false); setRefresh(n => n + 1) }} />
      )}
    </main>
  )
}
