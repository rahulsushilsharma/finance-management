import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowUpRight, ArrowDownRight, Search, History } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useData } from '@/hooks/useData'
import { useHousehold } from '@/hooks/useHousehold'
import { deleteTransaction } from '@/lib/firestore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, cn } from '@/lib/utils'

export function Transactions() {
  const { selectedMonth, setSelectedMonth } = useStore()
  const { transactions } = useData()
  const { householdId } = useHousehold()
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')

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
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
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
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <History size={32} strokeWidth={1.25} />
          <p className="text-sm">No transactions found</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
          {filtered.map((t) => {
            const isIncome = t.type === 'income'
            return (
              <li key={t.id} className="flex items-center justify-between px-4 py-3 gap-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                    isIncome ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'
                  )}>
                    {isIncome
                      ? <ArrowUpRight size={16} className="text-green-600 dark:text-green-400" />
                      : <ArrowDownRight size={16} className="text-red-600 dark:text-red-400" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate leading-tight">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">{t.category}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(t.date), 'MMM d')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    'text-sm font-bold',
                    isIncome ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                  )}>
                    {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(t.id)}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    ✕
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
