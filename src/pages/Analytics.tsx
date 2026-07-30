import { useMemo } from 'react'
import { format, subMonths, parseISO } from 'date-fns'
import { useStore } from '@/store/useStore'
import { useData } from '@/hooks/useData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, currentMonth } from '@/lib/utils'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#06b6d4',
]

function toMonthDate(m: string) { return parseISO(m + '-01') }

export function Analytics() {
  const { selectedMonth } = useStore()
  const { transactions, members, loading } = useData()

  // Category breakdown for selected month
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + t.amount
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  // Per-member spending for selected month
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

  // Last 6 months trend (income vs expense) — uses only currently loaded month
  // ponytail: single-month data only; multi-month trend needs separate listeners or a refactor
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = format(subMonths(toMonthDate(selectedMonth), 5 - i), 'yyyy-MM')
      const label = format(toMonthDate(m), 'MMM')
      if (m === selectedMonth) {
        const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        return { month: label, income, expense }
      }
      return { month: label, income: 0, expense: 0 }
    })
  }, [transactions, selectedMonth])

  const totalExpense = categoryData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto pb-32">
      <div>
        <h2 className="font-semibold text-base">{format(toMonthDate(selectedMonth), 'MMMM yyyy')}</h2>
        <p className="text-xs text-muted-foreground">Spending breakdown</p>
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
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No expenses this month</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {categoryData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span>{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{((d.value / totalExpense) * 100).toFixed(0)}%</span>
                          <span className="font-medium text-foreground">{formatCurrency(d.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-member spending */}
          {memberSpending.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Spending by Member</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={memberSpending} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Monthly trend — current month only, prior months show 0 until navigated */}
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Income vs Expenses
                {selectedMonth !== currentMonth() && (
                  <span className="ml-2 text-xs font-normal normal-case text-muted-foreground/60">(other months load on visit)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
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
