import { useState, useMemo } from 'react'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Target, Copy, AlertTriangle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/store/useStore'
import { useData } from '@/hooks/useData'
import { useHousehold } from '@/hooks/useHousehold'
import { addBudget, updateBudget, deleteBudget, getBudgetsForMonth } from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, currentMonth, cn } from '@/lib/utils'
import type { Budget } from '@/types'

function toMonthDate(m: string) { return parseISO(m + '-01') }

export function Budgets() {
  const { selectedMonth, setSelectedMonth } = useStore()
  const { householdId } = useHousehold()
  const { transactions, budgets, expenseCategories, currency, loading } = useData()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  const [form, setForm] = useState({ category: '', monthlyLimit: '', month: selectedMonth })
  const isCurrentMonth = selectedMonth === currentMonth()

  const { spentMap, totalBudgeted, totalSpent, overallPct } = useMemo(() => {
    const spentMap: Record<string, number> = {}
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      spentMap[t.category] = (spentMap[t.category] ?? 0) + t.amount
    })
    const totalBudgeted = budgets.reduce((s, b) => s + b.monthlyLimit, 0)
    const totalSpent = budgets.reduce((s, b) => s + (spentMap[b.category] ?? 0), 0)
    const overallPct = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0
    return { spentMap, totalBudgeted, totalSpent, overallPct }
  }, [transactions, budgets])

  const overBudgetCount = budgets.filter((b) => (spentMap[b.category] ?? 0) > b.monthlyLimit).length
  const remaining = totalBudgeted - totalSpent

  function prev() { setSelectedMonth(format(subMonths(toMonthDate(selectedMonth), 1), 'yyyy-MM')) }
  function next() { setSelectedMonth(format(addMonths(toMonthDate(selectedMonth), 1), 'yyyy-MM')) }

  function openAdd() {
    setEditId(null)
    setForm({ category: '', monthlyLimit: '', month: selectedMonth })
    setOpen(true)
  }

  function openEdit(b: Budget) {
    setEditId(b.id)
    setForm({ category: b.category, monthlyLimit: String(b.monthlyLimit), month: b.month })
    setOpen(true)
  }

  async function handleSubmit() {
    if (!householdId || !form.category || !form.monthlyLimit || !form.month) return
    const data = { category: form.category, monthlyLimit: parseFloat(form.monthlyLimit), month: form.month }
    if (editId != null) {
      await updateBudget(householdId, editId, data)
      toast.success('Budget updated')
    } else {
      await addBudget(householdId, data)
      toast.success('Budget added')
    }
    setOpen(false)
  }

  async function handleDelete() {
    if (!householdId || !deleteId) return
    await deleteBudget(householdId, deleteId)
    toast.success('Budget deleted')
    setDeleteId(null)
  }

  async function handleCopyLastMonth() {
    if (!householdId) return
    setCopying(true)
    const lastMonth = format(subMonths(toMonthDate(selectedMonth), 1), 'yyyy-MM')
    const prev = await getBudgetsForMonth(householdId, lastMonth)
    if (prev.length === 0) {
      toast.error('No budgets found in ' + format(toMonthDate(lastMonth), 'MMMM'))
      setCopying(false)
      return
    }
    const existingCategories = new Set(budgets.map((b) => b.category))
    const toAdd = prev.filter((b) => !existingCategories.has(b.category))
    if (toAdd.length === 0) {
      toast.error('All budgets already exist for this month')
      setCopying(false)
      return
    }
    await Promise.all(toAdd.map((b) => addBudget(householdId, { category: b.category, monthlyLimit: b.monthlyLimit, month: selectedMonth })))
    toast.success(`Copied ${toAdd.length} budget${toAdd.length > 1 ? 's' : ''} from ${format(toMonthDate(lastMonth), 'MMMM')}`)
    setCopying(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto pb-32">

      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 text-white shadow-xl">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">
          {format(toMonthDate(selectedMonth), 'MMMM yyyy')} · Budget
        </p>

        {budgets.length === 0 ? (
          <p className="text-2xl font-bold text-white/60 mt-1">No budgets set</p>
        ) : (
          <>
            <div className="flex items-end gap-3 mt-1 mb-4">
              <p className="text-3xl font-bold tracking-tight">
                {formatCurrency(totalSpent, currency)}
              </p>
              <p className="text-base text-white/50 mb-0.5">/ {formatCurrency(totalBudgeted, currency)}</p>
            </div>

            {/* overall progress bar */}
            <div className="w-full bg-white/10 rounded-full h-2 mb-3">
              <div
                className={cn(
                  'h-2 rounded-full transition-all',
                  overallPct >= 100 ? 'bg-red-400' : overallPct >= 80 ? 'bg-yellow-400' : 'bg-emerald-400'
                )}
                style={{ width: `${overallPct}%` }}
              />
            </div>

            <div className="flex gap-6 pt-3 border-t border-white/10">
              <div>
                <p className="text-xs text-white/40 mb-0.5">Remaining</p>
                <p className={cn('text-sm font-bold', remaining >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {remaining >= 0 ? formatCurrency(remaining, currency) : `−${formatCurrency(-remaining, currency)}`}
                </p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-xs text-white/40 mb-0.5">Categories</p>
                <p className="text-sm font-bold">{budgets.length}</p>
              </div>
              {overBudgetCount > 0 && (
                <>
                  <div className="w-px bg-white/10" />
                  <div>
                    <p className="text-xs text-white/40 mb-0.5">Over budget</p>
                    <p className="text-sm font-bold text-red-400">{overBudgetCount}</p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Month nav + actions ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={prev} className="h-8 w-8">
            <ChevronLeft size={18} />
          </Button>
          <div className="text-center px-1">
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyLastMonth} disabled={copying} className="gap-1.5">
            <Copy size={13} /> Copy
          </Button>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus size={13} /> Add
          </Button>
        </div>
      </div>

      {/* ── Budget cards ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Target size={24} strokeWidth={1.25} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">No budgets for {format(toMonthDate(selectedMonth), 'MMMM')}</p>
            <p className="text-xs opacity-60 mt-0.5">Set limits to track your spending</p>
          </div>
          <Button size="sm" onClick={openAdd} className="gap-1.5 mt-1">
            <Plus size={13} /> Add first budget
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {budgets.map((b) => {
            const spent = spentMap[b.category] ?? 0
            const pct = totalBudgeted > 0 ? Math.min((spent / b.monthlyLimit) * 100, 100) : 0
            const over = spent > b.monthlyLimit
            const warning = !over && pct >= 80
            return (
              <Card key={b.id} className={cn(
                'transition-colors',
                over && 'border-destructive/40 bg-red-50/30 dark:bg-red-950/10',
                warning && 'border-yellow-400/40 bg-yellow-50/30 dark:bg-yellow-950/10'
              )}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{b.category}</span>
                      {over && (
                        <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">Over</span>
                      )}
                      {warning && (
                        <AlertTriangle size={12} className="text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={() => openEdit(b)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteId(b.id)}>Delete</Button>
                    </div>
                  </div>

                  <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                    <div
                      className={cn('h-1.5 rounded-full transition-all', over ? 'bg-destructive' : warning ? 'bg-yellow-400' : 'bg-primary')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={cn(
                      'font-medium',
                      over ? 'text-destructive' : warning ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'
                    )}>
                      {formatCurrency(spent, currency)} spent
                    </span>
                    <span className="text-muted-foreground">
                      {over
                        ? <span className="text-destructive font-semibold">Over by {formatCurrency(spent - b.monthlyLimit, currency)}</span>
                        : <span>{formatCurrency(b.monthlyLimit - spent, currency)} left of {formatCurrency(b.monthlyLimit, currency)}</span>
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? '' })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Monthly limit</Label>
              <Input type="number" min="0" step="0.01" value={form.monthlyLimit} onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Month</Label>
              <Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.category || !form.monthlyLimit}>{editId ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete budget?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
