import { useState, useCallback } from 'react'
import { Droplets } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getFamily } from '../family/familyStore'
import { getMilkForMonth, addMilkEntry, deleteMilkEntry, monthlyMilkTotal } from '../modules/milk/store'
import type { MilkEntryInput } from '../modules/milk/types'

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function MilkScreen() {
  const { t } = useTranslation()
  const family = getFamily()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [, setRefresh] = useState(0)
  const [form, setForm] = useState({
    date: now.toISOString().slice(0, 10),
    litres: '',
    pricePerLitre: '60',
  })

  const prevMonth = useCallback(() => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else { setMonth(m => m - 1) }
  }, [month])

  const nextMonth = useCallback(() => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else { setMonth(m => m + 1) }
  }, [month])

  const handleAdd = useCallback(() => {
    if (!family || !form.litres) return
    const input: MilkEntryInput = {
      familyId: family.familyId,
      date: form.date,
      litres: parseFloat(form.litres),
      pricePerLitre: parseFloat(form.pricePerLitre) || 60,
    }
    addMilkEntry(input)
    setForm(f => ({ ...f, litres: '' }))
    setRefresh(n => n + 1)
  }, [form, family])

  if (!family) return null

  const entries = getMilkForMonth(family.familyId, year, month)
  const { litres, cost } = monthlyMilkTotal(entries)

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">{t('milk.title')}</p>
          <p className="screen-subtitle">{t('milk.subtitle')}</p>
        </div>
        <Droplets size={24} color="var(--accent)" />
      </header>

      <div className="screen-body">
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 12 }}>
          <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 20, cursor: 'pointer' }}>‹</button>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{monthLabel(year, month)}</p>
          <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 20, cursor: 'pointer' }}>›</button>
        </div>

        {/* Summary */}
        <div className="card card-p" style={{ marginBottom: 12, display: 'flex', gap: 24 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('milk.monthly_total')}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{litres.toFixed(1)} L</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('milk.monthly_cost')}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>₹{Math.round(cost).toLocaleString()}</p>
          </div>
        </div>

        {/* Add entry */}
        <div className="card card-p" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{t('milk.add_entry')}</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              placeholder={t('milk.litres')}
              value={form.litres}
              step="0.5"
              onChange={e => setForm(f => ({ ...f, litres: e.target.value }))}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
            />
            <input
              type="number"
              placeholder={t('milk.price_per_litre')}
              value={form.pricePerLitre}
              onChange={e => setForm(f => ({ ...f, pricePerLitre: e.target.value }))}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={handleAdd}>{t('common.save')}</button>
          </div>
        </div>

        {/* Entries */}
        {entries.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginTop: 24 }}>{t('milk.no_entries')}</p>
        )}
        {entries.slice().sort((a, b) => b.date.localeCompare(a.date)).map(e => (
          <div key={e.entryId} className="card card-p" style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{e.litres} L</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.date} · ₹{e.pricePerLitre}/L</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>₹{Math.round(e.litres * e.pricePerLitre)}</p>
              <button type="button" onClick={() => { deleteMilkEntry(e.entryId); setRefresh(n => n + 1) }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
