import { useState } from 'react'
import { TrendingDown, TrendingUp, ChevronLeft, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import { useHousehold } from '@/hooks/useHousehold'
import { useData } from '@/hooks/useData'
import { useAuth } from '@/hooks/useAuth'
import { addTransaction, addTransfer } from '@/lib/firestore'
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
import { currentMonth } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import type { TransactionType } from '@/types'

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { householdId } = useHousehold()
  const { expenseCategories, incomeCategories, accounts } = useData()
  const { user } = useAuth()
  const { selectedMonth } = useStore()
  const today = new Date().toISOString().slice(0, 10)
  const defaultDate = selectedMonth === currentMonth() ? today : selectedMonth + '-01'
  const defaultAccountId = accounts[0]?.id ?? ''
  const empty = { amount: '', description: '', category: '', date: defaultDate, accountId: defaultAccountId }
  const [type, setType] = useState<TransactionType | 'transfer' | null>(null)
  const [transferForm, setTransferForm] = useState({ amount: '', fromAccountId: accounts[0]?.id ?? '', toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? '', description: '', date: defaultDate })
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  function reset() {
    setType(null)
    setForm({ ...empty, accountId: accounts[0]?.id ?? '' })
    setTransferForm({ amount: '', fromAccountId: accounts[0]?.id ?? '', toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? '', description: '', date: defaultDate })
    setSaving(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSave() {
    if (!type || type === 'transfer' || !form.amount || !householdId || saving) return
    setSaving(true)
    try {
      const account = accounts.find((a) => a.id === form.accountId)
      await addTransaction(householdId, {
        type,
        amount: parseFloat(form.amount),
        category: form.category || 'Other',
        description: form.description || (type === 'income' ? 'Income' : 'Expense'),
        date: form.date,
        addedBy: user?.uid,
        ...(form.accountId ? { accountId: form.accountId } : {}),
      }, account?.type)
      toast.success(type === 'income' ? 'Income added' : 'Expense added')
      handleClose()
    } catch {
      toast.error('Failed to save. Try again.')
      setSaving(false)
    }
  }

  async function handleTransferSave() {
    if (!householdId || !transferForm.amount || saving) return
    if (transferForm.fromAccountId === transferForm.toAccountId) return
    setSaving(true)
    try {
      const fromAccount = accounts.find((a) => a.id === transferForm.fromAccountId)
      const toAccount = accounts.find((a) => a.id === transferForm.toAccountId)
      await addTransfer(
        householdId,
        transferForm.fromAccountId,
        fromAccount!.type,
        transferForm.toAccountId,
        toAccount!.type,
        parseFloat(transferForm.amount),
        transferForm.date,
        transferForm.description || 'Transfer',
        user?.uid
      )
      toast.success('Transfer added')
      handleClose()
    } catch {
      toast.error('Failed to save. Try again.')
      setSaving(false)
    }
  }

  const categories = type === 'income' ? incomeCategories : expenseCategories
  const canSave = !!form.amount && !saving

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm w-full p-0 gap-0 sm:rounded-2xl">
        {/* drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <DialogHeader className="px-5 pt-3 pb-3 sm:pt-5">
          <DialogTitle className="text-base font-semibold">
            {type == null ? 'Add transaction' : type === 'expense' ? 'Add expense' : type === 'income' ? 'Add income' : 'Transfer'}
          </DialogTitle>
        </DialogHeader>

        {type == null ? (
          <div className="flex flex-col gap-3 p-5 pt-2">
            <div className="flex gap-3">
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
            {accounts.length > 1 && (
              <button
                onClick={() => setType('transfer')}
                className="w-full rounded-xl border-2 border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 active:scale-95 transition-all py-4 flex items-center justify-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <ArrowLeftRight size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-semibold text-blue-600 dark:text-blue-400">Transfer between accounts</span>
              </button>
            )}
          </div>
        ) : type === 'transfer' ? (
          <div className="px-5 pb-5 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground block">Amount *</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                autoFocus
                placeholder="0.00"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                className="text-2xl font-bold h-14 text-center tracking-tight"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground block">From</Label>
              <div className="flex gap-1.5 flex-wrap">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    disabled={saving}
                    onClick={() => setTransferForm((f) => ({ ...f, fromAccountId: a.id }))}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${
                      transferForm.fromAccountId === a.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground block">To</Label>
              <div className="flex gap-1.5 flex-wrap">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    disabled={saving}
                    onClick={() => setTransferForm((f) => ({ ...f, toAccountId: a.id }))}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${
                      transferForm.toAccountId === a.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Description <span className="opacity-40">optional</span>
              </Label>
              <Input
                placeholder="e.g. Moving savings"
                value={transferForm.description}
                onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Date</Label>
              <Input
                type="date"
                value={transferForm.date}
                onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              disabled={!transferForm.amount || transferForm.fromAccountId === transferForm.toAccountId || saving}
              onClick={handleTransferSave}
            >
              {saving ? 'Saving…' : 'Transfer'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setType(null)} disabled={saving} className="gap-1 text-muted-foreground w-full">
              <ChevronLeft size={14} /> Back
            </Button>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-3">

            {/* Amount + account chips + save — all together so save is visible above keyboard */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground block">Amount *</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                autoFocus
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="text-2xl font-bold h-14 text-center tracking-tight"
              />
              {accounts.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      disabled={saving}
                      onClick={() => setForm((f) => ({ ...f, accountId: a.id }))}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${
                        form.accountId === a.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              )}
              {/* Save right here — always visible even when keyboard is open */}
              <Button
                className="w-full"
                disabled={!canSave}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : type === 'expense' ? 'Add expense' : 'Add income'}
              </Button>
            </div>

            {/* Optional fields below — scroll to access */}
            <div className="pt-1 border-t border-border space-y-3">
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

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setType(null)}
                disabled={saving}
                className="gap-1 text-muted-foreground w-full"
              >
                <ChevronLeft size={14} /> Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
