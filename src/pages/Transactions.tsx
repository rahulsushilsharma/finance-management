import { useState } from 'react'
import { format } from 'date-fns'
import { useStore } from '@/store/useStore'
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

export function Transactions() {
  const { transactions, deleteTransaction } = useStore()
  const [filterType, setFilterType] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [search, setSearch] = useState('')

  const filtered = transactions
    .filter((t) => filterType === 'all' || t.type === filterType)
    .filter((t) => !filterMonth || t.date.startsWith(filterMonth))
    .filter(
      (t) =>
        !search ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* filters */}
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
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
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
                <span
                  className={`text-sm font-semibold ${
                    t.type === 'income'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTransaction(t.id)}
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
