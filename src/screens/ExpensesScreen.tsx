import { useState, useCallback } from 'react'
import { Plus, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getFamily } from '../family/familyStore'
import { getExpensesForMonth, addExpense, deleteExpense, sumByCategory } from '../modules/expenses/store'
import type { ExpenseInput, ExpenseCategory } from '../modules/expenses/types'

const CATEGORIES: ExpenseCategory[] = ['petrol', 'milk', 'electricity', 'gas', 'water', 'other']

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function ExpensesScreen() {
  const { t } = useTranslation()
  const family = getFamily()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [showAdd, setShowAdd] = useState(false)
  const [, setRefresh] = useState(0)
  const [form, setForm] = useState({ category: 'petrol' as ExpenseCategory, amount: '', date: now.toISOString().slice(0, 10), notes: '' })

  const prevMonth = useCallback(() => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else { setMonth(m => m - 1) }
  }, [month])

  const nextMonth = useCallback(() => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else { setMonth(m => m + 1) }
  }, [month])

  const handleAdd = useCallback(() => {
    if (!family || !form.amount) return
    const input: ExpenseInput = {
      familyId: family.familyId,
      memberId: family.myMemberId,
      category: form.category,
      amount: parseFloat(form.amount),
      currency: 'INR',
      date: form.date,
      notes: form.notes || undefined,
    }
    addExpense(input)
    setForm(f => ({ ...f, amount: '', notes: '' }))
    setShowAdd(false)
    setRefresh(n => n + 1)
  }, [form, family])

  if (!family) return null

  const expenses = getExpensesForMonth(family.familyId, year, month)
  const totals = sumByCategory(expenses)
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0)

  return (
    <main className="screen">
      <header className="screen-header" style={{ paddingTop: 20 }}>
        <div>
          <p className="screen-title">{t('expenses.title')}</p>
          <p className="screen-subtitle">{t('expenses.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(s => !s)}
          style={{ background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', cursor: 'pointer' }}
        >
          <Plus size={16} />
        </button>
      </header>

      <div className="screen-body">
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 12 }}>
          <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 20, cursor: 'pointer' }}>‹</button>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{monthLabel(year, month)}</p>
          <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 20, cursor: 'pointer' }}>›</button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="card card-p" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{t(`expenses.${c}`)}</option>)}
              </select>
              <input
                type="number"
                placeholder={t('expenses.amount')}
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAdd}>{t('common.save')}</button>
            </div>
          </div>
        )}

        {/* Summary card */}
        <div className="card card-p" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <TrendingUp size={16} color="var(--accent)" />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t('expenses.this_month')}</p>
          </div>
          {CATEGORIES.filter(c => totals[c] > 0).map(c => (
            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t(`expenses.${c}`)}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>₹{totals[c].toLocaleString()}</p>
            </div>
          ))}
          {grandTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('expenses.total')}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>₹{grandTotal.toLocaleString()}</p>
            </div>
          )}
          {grandTotal === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('expenses.no_expenses')}</p>}
        </div>

        {/* Expense list */}
        {expenses.slice().reverse().map(e => (
          <div key={e.expenseId} className="card card-p" style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t(`expenses.${e.category}`)}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.date}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>₹{e.amount.toLocaleString()}</p>
              <button type="button" onClick={() => { deleteExpense(e.expenseId); setRefresh(n => n + 1) }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
