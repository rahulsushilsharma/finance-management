import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useStore } from '@/store/useStore'
import { useHousehold } from '@/hooks/useHousehold'
import { listenTransactions, deleteTransaction } from '@/lib/firestore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types'

export function Transactions() {
  const { selectedMonth, setSelectedMonth } = useStore()
  const { householdId } = useHousehold()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!householdId) return
    return listenTransactions(householdId, selectedMonth, setTransactions)
  }, [householdId, selectedMonth])

  const filtered = transactions
    .filter((t) => filterType === 'all' || t.type === filterType)
    .filter(
      (t) =>
        !search ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  function handleDelete(id: string) {
    if (!householdId) return
    deleteTransaction(householdId, id)
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-36 flex-1 min-w-0"
        />
        <Select value={filterType} onValueChange={(v) => setFilterType(v ?? 'all')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-40"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No transactions found.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden bg-card">
          {filtered.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl shrink-0">{t.type === 'income' ? '💰' : '💸'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">{t.category}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(t.date), 'MMM d')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(t.id)}
                  className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
