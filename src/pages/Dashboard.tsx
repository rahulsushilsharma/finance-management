import { useMemo } from 'react'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { useStore } from '@/store/useStore'
import { useData } from '@/hooks/useData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, currentMonth } from '@/lib/utils'

function toMonthDate(month: string) {
  return parseISO(month + '-01')
}

export function Dashboard() {
  const { selectedMonth, setSelectedMonth } = useStore()
  const { transactions } = useData()

  const isCurrentMonth = selectedMonth === currentMonth()

  const { income, expenses } = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expenses }
  }, [transactions])

  const balance = income - expenses
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date))

  function prev() { setSelectedMonth(format(subMonths(toMonthDate(selectedMonth), 1), 'yyyy-MM')) }
  function next() { setSelectedMonth(format(addMonths(toMonthDate(selectedMonth), 1), 'yyyy-MM')) }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={prev}>‹</Button>
        <div className="text-center">
          <p className="font-semibold text-sm">{format(toMonthDate(selectedMonth), 'MMMM yyyy')}</p>
          {!isCurrentMonth && (
            <button onClick={() => setSelectedMonth(currentMonth())} className="text-xs text-primary underline underline-offset-2">
              Back to today
            </button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={next} disabled={isCurrentMonth}>›</Button>
      </div>

      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="pt-5 pb-5 text-center">
          <p className="text-sm opacity-70 mb-1">Balance</p>
          <p className="text-4xl font-bold tracking-tight">{formatCurrency(balance)}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Income</p>
            <p className="text-xl font-semibold text-green-600 dark:text-green-400">+{formatCurrency(income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Expenses</p>
            <p className="text-xl font-semibold text-red-600 dark:text-red-400">-{formatCurrency(expenses)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">
            {isCurrentMonth ? 'This month' : format(toMonthDate(selectedMonth), 'MMMM')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {isCurrentMonth ? 'No transactions yet. Tap + to add one.' : 'No transactions this month.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sorted.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{t.type === 'income' ? '💰' : '💸'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.category}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'MMM d')}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
