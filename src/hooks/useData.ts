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
import { listenTransactions, listenBudgets, listenMembers, listenHousehold, listenAccounts, type Member } from '@/lib/firestore'
export const DEFAULT_CURRENCY = 'USD'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants'
import type { Transaction, Budget, Account } from '@/types'

interface DataCtx {
  transactions: Transaction[]
  budgets: Budget[]
  members: Member[]
  accounts: Account[]
  currency: string
  expenseCategories: string[]
  incomeCategories: string[]
  loading: boolean
}

const Ctx = createContext<DataCtx>({
  transactions: [],
  budgets: [],
  members: [],
  accounts: [],
  currency: DEFAULT_CURRENCY,
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
  const [accounts, setAccounts] = useState<Account[]>([])
  const [customCategories, setCustomCategories] = useState<{ expense: string[]; income: string[] } | null>(null)
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [loading, setLoading] = useState(true)

  const txCache = useRef<Map<string, Transaction[]>>(new Map())
  const currentMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    if (!householdId) return
    const unsubMembers = listenMembers(householdId, setMembers)
    const unsubAccounts = listenAccounts(householdId, setAccounts)
    const unsubHousehold = listenHousehold(householdId, (data) => {
      setCustomCategories(data.customCategories ?? null)
      setCurrency(data.currency ?? DEFAULT_CURRENCY)
    })
    return () => { unsubMembers(); unsubAccounts(); unsubHousehold() }
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
    { value: { transactions, budgets, members, accounts, currency, expenseCategories, incomeCategories, loading } },
    children
  )
}

export const useData = () => useContext(Ctx)
