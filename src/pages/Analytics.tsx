import { useMemo, useState, useEffect } from 'react'
import { format, subMonths, parseISO } from 'date-fns'
import { useStore } from '@/store/useStore'
import { useData } from '@/hooks/useData'
import { useHousehold } from '@/hooks/useHousehold'
import { getTransactionsForMonth } from '@/lib/firestore'
import type { Transaction } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#06b6d4',
]

function toMonthDate(m: string) { return parseISO(m + '-01') }

export function Analytics() {
  const { selectedMonth } = useStore()
  const { transactions, members, currency, loading } = useData()
  const { householdId } = useHousehold()
  const [pastMonthsData, setPastMonthsData] = useState<Record<string, Transaction[]>>({})

  const { categoryData, totalExpense, totalIncome, topCategory } = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + t.amount
    })
    const categoryData = Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    const totalExpense = categoryData.reduce((s, d) => s + d.value, 0)
    const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const topCategory = categoryData[0] ?? null
    return { categoryData, totalExpense, totalIncome, topCategory }
  }, [transactions])

  const memberMap = useMemo(() => {
    const map: Record<string, string> = {}
    members.forEach((m) => { map[m.uid] = m.displayName })
    return map
  }, [members])

  const memberSpending = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.filter((t) => t.type === 'expense' && t.addedBy).forEach((t) => {
      const name = memberMap[t.addedBy!] ?? 'Unknown'
      map[name] = (map[name] ?? 0) + t.amount
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [transactions, memberMap])

  useEffect(() => {
    if (!householdId) return
    const months = Array.from({ length: 5 }, (_, i) =>
      format(subMonths(toMonthDate(selectedMonth), 5 - i), 'yyyy-MM')
    )
    Promise.all(months.map((m) => getTransactionsForMonth(householdId, m).then((txs) => [m, txs] as const)))
      .then((entries) => setPastMonthsData(Object.fromEntries(entries)))
      .catch(() => {/* non-fatal: chart shows 0 for failed months */})
  }, [householdId, selectedMonth])

  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = format(subMonths(toMonthDate(selectedMonth), 5 - i), 'yyyy-MM')
      const label = format(toMonthDate(m), 'MMM')
      const txs = m === selectedMonth ? transactions : (pastMonthsData[m] ?? [])
      const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      return { month: label, income, expense }
    })
  }, [transactions, selectedMonth, pastMonthsData])

  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : null

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto pb-32">

      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 text-white shadow-xl">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">
          {format(toMonthDate(selectedMonth), 'MMMM yyyy')} · Insights
        </p>

        {loading ? (
          <div className="space-y-2 mt-2">
            <Skeleton className="h-8 w-40 bg-white/10" />
            <Skeleton className="h-4 w-56 bg-white/10" />
          </div>
        ) : totalExpense === 0 ? (
          <p className="text-2xl font-bold text-white/60 mt-1">No spending data</p>
        ) : (
          <>
            <p className="text-3xl font-bold tracking-tight mt-1">{formatCurrency(totalExpense, currency)}</p>
            <p className="text-sm text-white/50 mt-0.5">total spent across {categoryData.length} categories</p>

            <div className="flex gap-6 mt-4 pt-4 border-t border-white/10 flex-wrap">
              {topCategory && (
                <div>
                  <p className="text-xs text-white/40 mb-0.5">Top category</p>
                  <p className="text-sm font-bold">{topCategory.name}</p>
                  <p className="text-xs text-white/50">{formatCurrency(topCategory.value, currency)} · {((topCategory.value / totalExpense) * 100).toFixed(0)}%</p>
                </div>
              )}
              {savingsRate !== null && (
                <>
                  <div className="w-px bg-white/10" />
                  <div>
                    <p className="text-xs text-white/40 mb-0.5">Savings rate</p>
                    <p className={`text-sm font-bold ${savingsRate >= 20 ? 'text-emerald-400' : savingsRate >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {savingsRate.toFixed(0)}%
                    </p>
                    <p className="text-xs text-white/50">{formatCurrency(totalIncome - totalExpense, currency)} saved</p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Expense by category */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No expenses this month</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        paddingAngle={2} dataKey="value"
                      >
                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v as number, currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2.5">
                    {categoryData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-sm flex-1 truncate">{d.name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          <span>{((d.value / totalExpense) * 100).toFixed(0)}%</span>
                          <span className="font-semibold text-foreground">{formatCurrency(d.value, currency)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-member spending */}
          {memberSpending.length > 1 && (
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Spending by Member</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={memberSpending} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v as number, currency)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => formatCurrency(v as number, currency)} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Income vs Expenses trend */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatCurrency(v as number, currency)} tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v) => formatCurrency(v as number, currency)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
