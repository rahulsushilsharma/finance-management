import { useState } from 'react'
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
} from '@/components/ui/dialog'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants'
import type { TransactionType } from '@/types'

const EMPTY = {
  amount: '',
  description: '',
  category: '',
  date: new Date().toISOString().slice(0, 10),
}

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addTransaction = useStore((s) => s.addTransaction)
  const [type, setType] = useState<TransactionType | null>(null)
  const [form, setForm] = useState(EMPTY)

  function reset() {
    setType(null)
    setForm(EMPTY)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSave() {
    if (!type || !form.amount) return
    addTransaction({
      type,
      amount: parseFloat(form.amount),
      category: form.category || (type === 'income' ? 'Other' : 'Other'),
      description: form.description || (type === 'income' ? 'Income' : 'Expense'),
      date: form.date,
    })
    handleClose()
  }

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm w-full p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">
            {type == null ? 'What are you adding?' : type === 'expense' ? '💸 Expense' : '💰 Income'}
          </DialogTitle>
        </DialogHeader>

        {type == null ? (
          <div className="flex gap-3 p-5 pt-2">
            <button
              onClick={() => setType('expense')}
              className="flex-1 rounded-xl border-2 border-destructive/40 bg-destructive/5 hover:bg-destructive/10 active:scale-95 transition-all py-8 flex flex-col items-center gap-2"
            >
              <span className="text-4xl">💸</span>
              <span className="font-semibold text-destructive">Expense</span>
            </button>
            <button
              onClick={() => setType('income')}
              className="flex-1 rounded-xl border-2 border-green-500/40 bg-green-500/5 hover:bg-green-500/10 active:scale-95 transition-all py-8 flex flex-col items-center gap-2"
            >
              <span className="text-4xl">💰</span>
              <span className="font-semibold text-green-600 dark:text-green-400">Income</span>
            </button>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Amount *</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                autoFocus
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="text-3xl font-bold h-16 text-center tracking-tight"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Description <span className="opacity-50">(optional)</span></Label>
              <Input
                placeholder="Groceries, salary..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Category <span className="opacity-50">(optional)</span></Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick one" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Date <span className="opacity-50">(optional)</span></Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setType(null)}>
                ← Back
              </Button>
              <Button
                className="flex-1"
                disabled={!form.amount}
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
