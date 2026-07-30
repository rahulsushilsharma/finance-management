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
import { listenTransactions, listenBudgets, listenMembers, listenHousehold, listenAccounts, listenRecurring, addTransaction, type Member, type RecurringTransaction } from '@/lib/firestore'
export const DEFAULT_CURRENCY = 'USD'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants'
import type { Transaction, Budget, Account } from '@/types'

interface DataCtx {
  transactions: Transaction[]
  budgets: Budget[]
  members: Member[]
  accounts: Account[]
  accountsReady: boolean
  recurring: RecurringTransaction[]
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
  accountsReady: false,
  recurring: [],
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
  const [accountsReady, setAccountsReady] = useState(false)
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [customCategories, setCustomCategories] = useState<{ expense: string[]; income: string[] } | null>(null)
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [loading, setLoading] = useState(true)

  const txCache = useRef<Map<string, Transaction[]>>(new Map())
  const currentMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    if (!householdId) return
    setAccountsReady(false)
    const unsubMembers = listenMembers(householdId, setMembers)
    const unsubAccounts = listenAccounts(householdId, (a) => { setAccounts(a); setAccountsReady(true) })
    const unsubHousehold = listenHousehold(householdId, (data) => {
      setCustomCategories(data.customCategories ?? null)
      setCurrency(data.currency ?? DEFAULT_CURRENCY)
    })
    const unsubRecurring = listenRecurring(householdId, setRecurring)
    return () => { unsubMembers(); unsubAccounts(); unsubHousehold(); unsubRecurring() }
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

  useEffect(() => {
    if (!householdId || recurring.length === 0) return
    const now = new Date()
    const thisMonth = now.toISOString().slice(0, 7)
    const today = now.getDate()
    recurring.filter((r) => r.active && today >= r.dayOfMonth).forEach((r) => {
      const expectedDate = `${thisMonth}-${String(r.dayOfMonth).padStart(2, '0')}`
      const alreadyExists = transactions.some(
        (t) => t.description === r.description && t.amount === r.amount && t.date === expectedDate
      )
      if (!alreadyExists) {
        addTransaction(householdId, {
          type: r.type, amount: r.amount, category: r.category,
          description: r.description, date: expectedDate,
          addedBy: r.addedBy,
          ...(r.accountId ? { accountId: r.accountId } : {}),
        })
      }
    })
  // ponytail: transactions excluded from deps to avoid infinite loop; reruns only when recurring changes
  }, [recurring, householdId])

  const expenseCategories = customCategories
    ? [...new Set([...EXPENSE_CATEGORIES, ...customCategories.expense])]
    : [...EXPENSE_CATEGORIES]

  const incomeCategories = customCategories
    ? [...new Set([...INCOME_CATEGORIES, ...customCategories.income])]
    : [...INCOME_CATEGORIES]

  return createElement(
    Ctx.Provider,
    { value: { transactions, budgets, members, accounts, accountsReady, recurring, currency, expenseCategories, incomeCategories, loading } },
    children
  )
}

export const useData = () => useContext(Ctx)
