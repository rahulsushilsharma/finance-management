import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  createElement,
} from 'react'
import { useStore } from '@/store/useStore'
import { useHousehold } from './useHousehold'
import { listenTransactions, listenBudgets, listenMembers, listenHousehold, type Member } from '@/lib/firestore'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants'
import type { Transaction, Budget } from '@/types'

interface DataCtx {
  transactions: Transaction[]
  budgets: Budget[]
  members: Member[]
  expenseCategories: string[]
  incomeCategories: string[]
  loading: boolean
}

const Ctx = createContext<DataCtx>({
  transactions: [],
  budgets: [],
  members: [],
  expenseCategories: [...EXPENSE_CATEGORIES],
  incomeCategories: [...INCOME_CATEGORIES],
  loading: true,
})

export function DataProvider({ children }: { children: ReactNode }) {
  const { selectedMonth } = useStore()
  const { householdId } = useHousehold()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [customCategories, setCustomCategories] = useState<{ expense: string[]; income: string[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const txCache = useRef<Map<string, Transaction[]>>(new Map())
  const currentMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    if (!householdId) return
    const unsubMembers = listenMembers(householdId, setMembers)
    const unsubHousehold = listenHousehold(householdId, (data) => {
      setCustomCategories(data.customCategories ?? null)
    })
    return () => { unsubMembers(); unsubHousehold() }
  }, [householdId])

  useEffect(() => {
    if (!householdId) return

    const isPast = selectedMonth < currentMonth
    if (isPast && txCache.current.has(selectedMonth)) {
      setTransactions(txCache.current.get(selectedMonth)!)
      setLoading(false)
    } else {
      setLoading(true)
    }

    const unsubTx = listenTransactions(householdId, selectedMonth, (txns) => {
      if (isPast) txCache.current.set(selectedMonth, txns)
      setTransactions(txns)
      setLoading(false)
    })

    const unsubBudgets = listenBudgets(householdId, selectedMonth, (b) => {
      setBudgets(b)
    })

    return () => { unsubTx(); unsubBudgets() }
  }, [householdId, selectedMonth])

  const expenseCategories = customCategories
    ? [...new Set([...EXPENSE_CATEGORIES, ...customCategories.expense])]
    : [...EXPENSE_CATEGORIES]

  const incomeCategories = customCategories
    ? [...new Set([...INCOME_CATEGORIES, ...customCategories.income])]
    : [...INCOME_CATEGORIES]

  return createElement(
    Ctx.Provider,
    { value: { transactions, budgets, members, expenseCategories, incomeCategories, loading } },
    children
  )
}

export const useData = () => useContext(Ctx)
