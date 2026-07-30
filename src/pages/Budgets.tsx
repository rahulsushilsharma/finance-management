import { useState, useMemo } from 'react'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Target, Copy, AlertTriangle } from 'lucide-react'
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
  const { transactions, budgets, expenseCategories, loading } = useData()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  const [form, setForm] = useState({ category: '', monthlyLimit: '', month: selectedMonth })

  const isCurrentMonth = selectedMonth === currentMonth()

  const spentMap = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + t.amount
    })
    return map
  }, [transactions])

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
    await Promise.all(prev.map((b) => addBudget(householdId, { category: b.category, monthlyLimit: b.monthlyLimit, month: selectedMonth })))
    toast.success(`Copied ${prev.length} budget${prev.length > 1 ? 's' : ''} from ${format(toMonthDate(lastMonth), 'MMMM')}`)
    setCopying(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto pb-32">
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

      <div className="flex justify-between gap-2">
        <Button variant="outline" size="sm" onClick={handleCopyLastMonth} disabled={copying} className="gap-1.5">
          <Copy size={13} /> Copy last month
        </Button>
        <Button onClick={openAdd}>+ Add Budget</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Target size={32} strokeWidth={1.25} />
          <p className="text-sm">No budgets for {format(toMonthDate(selectedMonth), 'MMMM')}</p>
          <p className="text-xs opacity-60">Tap + to set a spending limit, or copy from last month</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {budgets.map((b) => {
            const spent = spentMap[b.category] ?? 0
            const pct = Math.min((spent / b.monthlyLimit) * 100, 100)
            const over = spent > b.monthlyLimit
            const warning = !over && pct >= 80
            return (
              <Card key={b.id} className={cn(over && 'border-destructive/50', warning && 'border-yellow-400/50')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{b.category}</span>
                      {warning && <AlertTriangle size={13} className="text-yellow-500" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(spent)} / {formatCurrency(b.monthlyLimit)}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEdit(b)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteId(b.id)}>Delete</Button>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all',
                        over ? 'bg-destructive' : warning ? 'bg-yellow-400' : 'bg-primary'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span className={cn(over && 'text-destructive font-medium', warning && 'text-yellow-600 font-medium dark:text-yellow-400')}>
                      {pct.toFixed(0)}% used
                    </span>
                    <span>{over ? `Over by ${formatCurrency(spent - b.monthlyLimit)}` : `${formatCurrency(b.monthlyLimit - spent)} left`}</span>
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
              <Label>Monthly Limit</Label>
              <Input type="number" min="0" step="0.01" value={form.monthlyLimit} onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })} placeholder="500.00" />
            </div>
            <div className="space-y-1">
              <Label>Month</Label>
              <Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editId ? 'Save' : 'Add'}</Button>
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
