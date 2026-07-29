import { useState, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { EXPENSE_CATEGORIES } from '@/lib/constants'
import { formatCurrency, currentMonth } from '@/lib/utils'

export function Budgets() {
  const { budgets, transactions, addBudget, updateBudget, deleteBudget } = useStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ category: '', monthlyLimit: '', month: currentMonth() })

  const spentMap = useMemo(() => {
    const map: Record<string, number> = {}
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const key = `${t.category}:${t.date.slice(0, 7)}`
        map[key] = (map[key] ?? 0) + t.amount
      })
    return map
  }, [transactions])

  function openAdd() {
    setEditId(null)
    setForm({ category: '', monthlyLimit: '', month: currentMonth() })
    setOpen(true)
  }

  function openEdit(b: (typeof budgets)[0]) {
    setEditId(b.id)
    setForm({ category: b.category, monthlyLimit: String(b.monthlyLimit), month: b.month })
    setOpen(true)
  }

  function handleSubmit() {
    if (!form.category || !form.monthlyLimit || !form.month) return
    const data = { category: form.category, monthlyLimit: parseFloat(form.monthlyLimit), month: form.month }
    if (editId != null) updateBudget(editId, data)
    else addBudget(data)
    setOpen(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}>+ Add Budget</Button>
      </div>

      {budgets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No budgets set.</p>
      ) : (
        <div className="grid gap-3">
          {budgets.map((b) => {
            const spent = spentMap[`${b.category}:${b.month}`] ?? 0
            const pct = Math.min((spent / b.monthlyLimit) * 100, 100)
            const over = spent > b.monthlyLimit
            return (
              <Card key={b.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">{b.category}</span>
                      <span className="text-muted-foreground text-sm ml-2">{b.month}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(spent)} / {formatCurrency(b.monthlyLimit)}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBudget(b.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${over ? 'bg-destructive' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{pct.toFixed(0)}% used</span>
                    <span>
                      {over
                        ? `Over by ${formatCurrency(spent - b.monthlyLimit)}`
                        : `${formatCurrency(b.monthlyLimit - spent)} left`}
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
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v ?? '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Monthly Limit</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyLimit}
                onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })}
                placeholder="500.00"
              />
            </div>
            <div className="space-y-1">
              <Label>Month</Label>
              <Input
                type="month"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editId ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
