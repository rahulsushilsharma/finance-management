import { useState } from 'react'
import { TrendingDown, TrendingUp, ChevronLeft } from 'lucide-react'
import { useHousehold } from '@/hooks/useHousehold'
import { addTransaction } from '@/lib/firestore'
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
  const { householdId } = useHousehold()
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

  async function handleSave() {
    if (!type || !form.amount || !householdId) return
    await addTransaction(householdId, {
      type,
      amount: parseFloat(form.amount),
      category: form.category || 'Other',
      description: form.description || (type === 'income' ? 'Income' : 'Expense'),
      date: form.date,
    })
    handleClose()
  }

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm w-full p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold">
            {type == null ? 'Add transaction' : type === 'expense' ? 'Add expense' : 'Add income'}
          </DialogTitle>
        </DialogHeader>

        {type == null ? (
          <div className="flex gap-3 p-5 pt-2">
            <button
              onClick={() => setType('expense')}
              className="flex-1 rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 active:scale-95 transition-all py-8 flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <TrendingDown size={22} className="text-red-600 dark:text-red-400" />
              </div>
              <span className="font-semibold text-red-600 dark:text-red-400">Expense</span>
            </button>
            <button
              onClick={() => setType('income')}
              className="flex-1 rounded-xl border-2 border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 active:scale-95 transition-all py-8 flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <TrendingUp size={22} className="text-green-600 dark:text-green-400" />
              </div>
              <span className="font-semibold text-green-600 dark:text-green-400">Income</span>
            </button>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  autoFocus
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="text-2xl font-bold h-14 text-center pl-6 tracking-tight"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Description <span className="opacity-40">optional</span>
              </Label>
              <Input
                placeholder={type === 'income' ? 'Salary, freelance...' : 'Groceries, rent...'}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Category <span className="opacity-40">optional</span>
                </Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? '' })}>
                  <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Date <span className="opacity-40">optional</span>
                </Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setType(null)} className="gap-1 text-muted-foreground">
                <ChevronLeft size={14} /> Back
              </Button>
              <Button className="flex-1" disabled={!form.amount} onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
