export type ExpenseCategory = 'petrol' | 'milk' | 'electricity' | 'gas' | 'water' | 'other'

export interface Expense {
  expenseId: string
  familyId: string
  memberId: string
  category: ExpenseCategory
  amount: number
  currency: string    // ISO 4217, default 'INR'
  date: string        // YYYY-MM-DD
  notes?: string
  createdAt: string
}

export type ExpenseInput = Omit<Expense, 'expenseId' | 'createdAt'>
