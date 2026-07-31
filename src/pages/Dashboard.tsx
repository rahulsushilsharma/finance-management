import { useMemo } from 'react'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Wallet, AlertCircle,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useData } from '@/hooks/useData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, currentMonth, cn } from '@/lib/utils'

function toMonthDate(month: string) { return parseISO(month + '-01') }

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  bank: 'Bank', cash: 'Cash', credit: 'Credit', investment: 'Investment', asset: 'Asset',
}

export function Dashboard() {
  const { selectedMonth, setSelectedMonth } = useStore()
  const { transactions, accounts, currency, loading } = useData()
  const isCurrentMonth = selectedMonth === currentMonth()

  const { income, expenses, cashFlow, savingsRate, unlinkedCount } = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'income' && !t.transferId).reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter((t) => t.type === 'expense' && !t.transferId).reduce((s, t) => s + t.amount, 0)
    const cashFlow = income - expenses
    const savingsRate = income > 0 ? Math.max(0, (cashFlow / income) * 100) : null
    const unlinkedCount = transactions.filter((t) => !t.accountId).length
    return { income, expenses, cashFlow, savingsRate, unlinkedCount }
  }, [transactions])

  const { netWorth, totalAssets, totalLiabilities } = useMemo(() => {
    if (accounts.length === 0) return { netWorth: null, totalAssets: 0, totalLiabilities: 0 }
    const totalAssets = accounts.filter((a) => a.type !== 'credit').reduce((s, a) => s + a.balance, 0)
    const totalLiabilities = accounts.filter((a) => a.type === 'credit').reduce((s, a) => s + a.balance, 0)
    return { netWorth: totalAssets - totalLiabilities, totalAssets, totalLiabilities }
  }, [accounts])

  const sorted = useMemo(() => [...transactions].sort((a, b) => b.date.localeCompare(a.date)), [transactions])

  function prev() { setSelectedMonth(format(subMonths(toMonthDate(selectedMonth), 1), 'yyyy-MM')) }
  function next() { setSelectedMonth(format(addMonths(toMonthDate(selectedMonth), 1), 'yyyy-MM')) }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto pb-32">

      {/* ── Net Worth Hero ── */}
      {netWorth !== null && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 text-white shadow-xl">
          {/* decorative blobs */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

          <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">Net Worth</p>
          <p className={cn('text-4xl font-bold tracking-tight', netWorth < 0 && 'text-red-400')}>
            {formatCurrency(netWorth, currency)}
          </p>

          {/* monthly delta */}
          {cashFlow !== 0 && (
            <div className={cn(
              'inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold',
              cashFlow > 0
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-red-500/20 text-red-300'
            )}>
              {cashFlow > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {cashFlow > 0 ? '+' : ''}{formatCurrency(cashFlow, currency)} this month
            </div>
          )}

          {/* assets / liabilities row */}
          <div className="flex gap-6 mt-5 pt-4 border-t border-white/10">
            <div>
              <p className="text-xs text-white/40 mb-0.5">Assets</p>
              <p className="text-sm font-semibold text-emerald-400">{formatCurrency(totalAssets, currency)}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <p className="text-xs text-white/40 mb-0.5">Liabilities</p>
              <p className="text-sm font-semibold text-red-400">{formatCurrency(totalLiabilities, currency)}</p>
            </div>
          </div>

          {/* account breakdown pills */}
          {accounts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 bg-white/8 rounded-full px-2.5 py-1">
                  <span className="text-xs text-white/50">{ACCOUNT_TYPE_LABEL[a.type]}</span>
                  <span className="text-xs font-medium text-white/80">{a.name}</span>
                  <span className={cn('text-xs font-bold', a.type === 'credit' ? 'text-red-300' : 'text-emerald-300')}>
                    {a.type === 'credit' ? '-' : ''}{formatCurrency(a.balance, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Month navigator ── */}
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

      {/* ── Cash Flow ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <TrendingUp size={10} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Income</p>
              </div>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatCurrency(income, currency)}
              </p>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <TrendingDown size={10} className="text-red-500 dark:text-red-400" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Expenses</p>
              </div>
              <p className="text-2xl font-bold tracking-tight text-red-500 dark:text-red-400">
                {formatCurrency(expenses, currency)}
              </p>
            </div>
          </div>
          {/* income vs expense ratio bar */}
          {(income > 0 || expenses > 0) && (
            <div className="flex h-1">
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${income / (income + expenses) * 100}%` }}
              />
              <div className="bg-red-500 flex-1" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Savings rate bar ── */}
      {savingsRate !== null && income > 0 && (
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-muted-foreground font-medium">Savings rate</p>
              <p className={cn(
                'text-xs font-bold',
                savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400'
                  : savingsRate >= 10 ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-500'
              )}>
                {savingsRate.toFixed(0)}%
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  savingsRate >= 20 ? 'bg-emerald-500' : savingsRate >= 10 ? 'bg-yellow-400' : 'bg-red-500'
                )}
                style={{ width: `${Math.min(savingsRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Unlinked transactions warning ── */}
      {unlinkedCount > 0 && accounts.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-950/30 px-3.5 py-3">
          <AlertCircle size={15} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            <span className="font-semibold">{unlinkedCount} transaction{unlinkedCount > 1 ? 's' : ''}</span> not linked to an account — net worth may not reflect your full cash flow.
          </p>
        </div>
      )}

      {/* ── Recent Transactions ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {isCurrentMonth ? 'Recent transactions' : format(toMonthDate(selectedMonth), 'MMMM')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2 px-0">
          {loading ? (
            <div className="space-y-1 px-4 py-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <Wallet size={32} strokeWidth={1.25} />
              <p className="text-sm">{isCurrentMonth ? 'No transactions yet' : 'No transactions this month'}</p>
              {isCurrentMonth && <p className="text-xs opacity-60">Tap + to add your first one</p>}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sorted.map((t) => {
                const isIncome = t.type === 'income'
                const isTransfer = !!t.transferId
                return (
                  <li key={t.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                        isTransfer ? 'bg-blue-100 dark:bg-blue-900/40' : isIncome ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'
                      )}>
                        {isIncome
                          ? <ArrowUpRight size={16} className={isTransfer ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'} />
                          : <ArrowDownRight size={16} className={isTransfer ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{t.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isTransfer
                            ? <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">Transfer {isIncome ? '↙ in' : '↗ out'}</span>
                            : <span className="text-xs text-muted-foreground">{t.category}</span>
                          }
                          {!t.accountId && accounts.length > 0 && (
                            <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">unlinked</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('text-sm font-bold', isTransfer ? 'text-blue-600 dark:text-blue-400' : isIncome ? 'text-green-600 dark:text-green-400' : 'text-foreground')}>
                        {isIncome ? '+' : '-'}{formatCurrency(t.amount, currency)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(t.date), 'MMM d')}</p>
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
