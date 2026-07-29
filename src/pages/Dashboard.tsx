import { useMemo } from 'react'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useData } from '@/hooks/useData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, currentMonth, cn } from '@/lib/utils'

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
  const positive = balance >= 0
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date))

  function prev() { setSelectedMonth(format(subMonths(toMonthDate(selectedMonth), 1), 'yyyy-MM')) }
  function next() { setSelectedMonth(format(addMonths(toMonthDate(selectedMonth), 1), 'yyyy-MM')) }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      {/* month navigator */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prev} className="h-8 w-8">
          <ChevronLeft size={18} />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-sm">{format(toMonthDate(selectedMonth), 'MMMM yyyy')}</p>
          {!isCurrentMonth && (
            <button onClick={() => setSelectedMonth(currentMonth())} className="text-xs text-primary underline underline-offset-2">
              Back to today
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={next} disabled={isCurrentMonth} className="h-8 w-8">
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* balance hero */}
      <div className={cn(
        'rounded-2xl p-6 text-white',
        positive
          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
          : 'bg-gradient-to-br from-rose-500 to-red-600'
      )}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium opacity-80">Balance</p>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Wallet size={16} />
          </div>
        </div>
        <p className="text-4xl font-bold tracking-tight">{formatCurrency(balance)}</p>
        <p className="text-xs opacity-60 mt-2">{format(toMonthDate(selectedMonth), 'MMMM yyyy')}</p>
      </div>

      {/* income / expense row */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-green-100 dark:border-green-900/40 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Income</p>
              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <TrendingUp size={12} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(income)}</p>
          </CardContent>
        </Card>
        <Card className="border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Expenses</p>
              <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                <TrendingDown size={12} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(expenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* transaction list */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {isCurrentMonth ? 'This month' : format(toMonthDate(selectedMonth), 'MMMM')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2 px-0">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Wallet size={32} strokeWidth={1.25} />
              <p className="text-sm">{isCurrentMonth ? 'No transactions yet' : 'No transactions this month'}</p>
              {isCurrentMonth && <p className="text-xs opacity-60">Tap + to add your first one</p>}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sorted.map((t) => {
                const isIncome = t.type === 'income'
                return (
                  <li key={t.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                        isIncome
                          ? 'bg-green-100 dark:bg-green-900/40'
                          : 'bg-red-100 dark:bg-red-900/40'
                      )}>
                        {isIncome
                          ? <ArrowUpRight size={16} className="text-green-600 dark:text-green-400" />
                          : <ArrowDownRight size={16} className="text-red-600 dark:text-red-400" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{t.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.category}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        'text-sm font-bold',
                        isIncome ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                      )}>
                        {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(t.date), 'MMM d')}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
