import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction, Budget } from '@/types'

interface AppStore {
  transactions: Transaction[]
  budgets: Budget[]
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, t: Partial<Omit<Transaction, 'id'>>) => void
  deleteTransaction: (id: string) => void
  addBudget: (b: Omit<Budget, 'id'>) => void
  updateBudget: (id: string, b: Partial<Omit<Budget, 'id'>>) => void
  deleteBudget: (id: string) => void
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      transactions: [],
      budgets: [],
      addTransaction: (t) =>
        set((s) => ({ transactions: [...s.transactions, { ...t, id: crypto.randomUUID() }] })),
      updateTransaction: (id, t) =>
        set((s) => ({
          transactions: s.transactions.map((tx) => (tx.id === id ? { ...tx, ...t } : tx)),
        })),
      deleteTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((tx) => tx.id !== id) })),
      addBudget: (b) =>
        set((s) => ({ budgets: [...s.budgets, { ...b, id: crypto.randomUUID() }] })),
      updateBudget: (id, b) =>
        set((s) => ({ budgets: s.budgets.map((bg) => (bg.id === id ? { ...bg, ...b } : bg)) })),
      deleteBudget: (id) =>
        set((s) => ({ budgets: s.budgets.filter((bg) => bg.id !== id) })),
    }),
    { name: 'finance-store' }
  )
)
