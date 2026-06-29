import type { Expense, ExpenseInput, ExpenseCategory } from './types'

const KEY = 'arkive_expenses_v1'

function randomId(): string { return Math.random().toString(36).slice(2, 18) }

function loadAll(): Expense[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Expense[]) : []
  } catch { return [] }
}

function saveAll(expenses: Expense[]): void {
  localStorage.setItem(KEY, JSON.stringify(expenses))
}

export function getExpenses(familyId: string): Expense[] {
  return loadAll().filter(e => e.familyId === familyId)
}

export function getExpensesForMonth(familyId: string, year: number, month: number): Expense[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return getExpenses(familyId).filter(e => e.date.startsWith(prefix))
}

export function addExpense(input: ExpenseInput): Expense {
  const expense: Expense = { ...input, expenseId: randomId(), createdAt: new Date().toISOString() }
  const all = loadAll()
  all.push(expense)
  saveAll(all)
  return expense
}

export function deleteExpense(expenseId: string): void {
  saveAll(loadAll().filter(e => e.expenseId !== expenseId))
}

export function sumByCategory(expenses: Expense[]): Record<ExpenseCategory, number> {
  const totals: Record<ExpenseCategory, number> = {
    petrol: 0, milk: 0, electricity: 0, gas: 0, water: 0, other: 0,
  }
  for (const e of expenses) totals[e.category] += e.amount
  return totals
}
