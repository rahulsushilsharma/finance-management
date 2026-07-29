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
import { listenTransactions, listenBudgets } from '@/lib/firestore'
import type { Transaction, Budget } from '@/types'

interface DataCtx {
  transactions: Transaction[]
  budgets: Budget[]
  loading: boolean
}

const Ctx = createContext<DataCtx>({ transactions: [], budgets: [], loading: true })

export function DataProvider({ children }: { children: ReactNode }) {
  const { selectedMonth } = useStore()
  const { householdId } = useHousehold()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  // cache past months — Map<month, Transaction[]>
  const txCache = useRef<Map<string, Transaction[]>>(new Map())
  const currentMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    if (!householdId) return

    const isPast = selectedMonth < currentMonth
    if (isPast && txCache.current.has(selectedMonth)) {
      setTransactions(txCache.current.get(selectedMonth)!)
      setLoading(false)
      // still need budgets for this month
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

    return () => {
      unsubTx()
      unsubBudgets()
    }
  }, [householdId, selectedMonth])

  return createElement(Ctx.Provider, { value: { transactions, budgets, loading } }, children)
}

export const useData = () => useContext(Ctx)
