import { useState, useCallback } from 'react'
import { Plus, Car, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getFamily } from '../family/familyStore'
import { getVehicles, addVehicle, deleteVehicle, isVehicleDocExpiringSoon } from '../modules/vehicles/store'
import type { Vehicle, VehicleInput, FuelType } from '../modules/vehicles/types'

function formatDate(d: string | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function VehicleCard({ vehicle, onDelete }: { vehicle: Vehicle; onDelete: () => void }) {
  const { t } = useTranslation()
  const pucWarn = isVehicleDocExpiringSoon(vehicle.pucExpiry)
  const insWarn = isVehicleDocExpiringSoon(vehicle.insuranceExpiry)

  return (
    <div className="card card-p" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{vehicle.name}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {vehicle.make} {vehicle.model} {vehicle.year} · {vehicle.registrationNumber}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {t(`vehicles.${vehicle.fuelType}`)}
          </p>
        </div>
        <button type="button" onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 14, cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('vehicles.puc_expiry')}</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: pucWarn ? 'var(--warning)' : 'var(--text)' }}>
            {formatDate(vehicle.pucExpiry)}{pucWarn && ' ⚠'}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('vehicles.insurance_expiry')}</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: insWarn ? 'var(--warning)' : 'var(--text)' }}>
            {formatDate(vehicle.insuranceExpiry)}{insWarn && ' ⚠'}
          </p>
        </div>
      </div>
    </div>
  )
}

function AddVehicleModal({ familyId, onClose }: { familyId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    name: '',
    make: '',
    model: '',
    year: String(new Date().getFullYear()),
    registrationNumber: '',
    fuelType: 'petrol' as FuelType,
    pucExpiry: '',
    insuranceExpiry: '',
    notes: '',
  })

  const handleSubmit = useCallback(() => {
    if (!form.name || !form.registrationNumber) return
    const input: VehicleInput = {
      familyId,
      name: form.name,
      make: form.make,
      model: form.model,
      year: parseInt(form.year) || new Date().getFullYear(),
      registrationNumber: form.registrationNumber,
      fuelType: form.fuelType,
      pucExpiry: form.pucExpiry || undefined,
      insuranceExpiry: form.insuranceExpiry || undefined,
      notes: form.notes || undefined,
    }
    addVehicle(input)
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
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{t('vehicles.add_vehicle')}</p>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        {field(t('vehicles.name'), 'name')}
        {field(t('vehicles.make'), 'make')}
        {field(t('vehicles.model'), 'model')}
        {field(t('vehicles.year'), 'year', 'number')}
        {field(t('vehicles.registration'), 'registrationNumber')}
        {field(t('vehicles.fuel_type'), 'fuelType', 'text', [
          { value: 'petrol', label: t('vehicles.petrol') },
          { value: 'diesel', label: t('vehicles.diesel') },
          { value: 'electric', label: t('vehicles.electric') },
          { value: 'cng', label: t('vehicles.cng') },
          { value: 'hybrid', label: t('vehicles.hybrid') },
        ])}
        {field(t('vehicles.puc_expiry'), 'pucExpiry', 'date')}
        {field(t('vehicles.insurance_expiry'), 'insuranceExpiry', 'date')}
        {field(t('common.notes'), 'notes')}
        <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit}>
          {t('common.save')}
        </button>
      </div>
    </div>
  )
}

export function VehiclesScreen() {
  const { t } = useTranslation()
  const family = getFamily()
  const [showAdd, setShowAdd] = useState(false)
  const [, setRefresh] = useState(0)

  if (!family) return null

  const vehicles = getVehicles(family.familyId)
  const warnCount = vehicles.filter(v => isVehicleDocExpiringSoon(v.pucExpiry) || isVehicleDocExpiringSoon(v.insuranceExpiry)).length

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">{t('vehicles.title')}</p>
          <p className="screen-subtitle">
            {vehicles.length > 0 ? `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'}` : t('vehicles.subtitle')}
            {warnCount > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--warning)' }}>
                <AlertTriangle size={12} style={{ display: 'inline', marginRight: 3 }} />{warnCount} expiring
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
        {vehicles.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <Car size={40} color="var(--text-muted)" />
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>{t('vehicles.no_vehicles')}</p>
            <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
              <Plus size={16} style={{ marginRight: 6 }} />{t('vehicles.add_vehicle')}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            {vehicles.map(v => (
              <VehicleCard key={v.vehicleId} vehicle={v} onDelete={() => { deleteVehicle(v.vehicleId); setRefresh(n => n + 1) }} />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddVehicleModal familyId={family.familyId} onClose={() => { setShowAdd(false); setRefresh(n => n + 1) }} />
      )}
    </main>
  )
}
