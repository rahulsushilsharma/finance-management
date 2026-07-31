import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowUpRight, ArrowDownRight, Search, History, Pencil, Download, X } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/store/useStore'
import { useData } from '@/hooks/useData'
import { useHousehold } from '@/hooks/useHousehold'
import { deleteTransaction, updateTransaction } from '@/lib/firestore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { formatCurrency, cn } from '@/lib/utils'
import type { Transaction } from '@/types'

export function Transactions() {
  const { selectedMonth, setSelectedMonth } = useStore()
  const { transactions, accounts, currency, expenseCategories, incomeCategories, loading } = useData()
  const { householdId } = useHousehold()
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState({ amount: '', description: '', category: '', date: '', accountId: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { income, expenses, filtered } = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const filtered = transactions
      .filter((t) => filterType === 'all' || t.type === filterType)
      .filter((t) =>
        !search ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b.date.localeCompare(a.date))
    return { income, expenses, filtered }
  }, [transactions, filterType, search])

  function openEdit(t: Transaction) {
    setEditTx(t)
    setEditForm({ amount: String(t.amount), description: t.description, category: t.category, date: t.date, accountId: t.accountId ?? '' })
  }

  async function handleEdit() {
    if (!householdId || !editTx || saving) return
    setSaving(true)
    try {
      const newAccount = accounts.find((a) => a.id === (editForm.accountId || editTx.accountId))
      await updateTransaction(
        householdId, editTx.id,
        { type: editTx.type, amount: editTx.amount, accountId: editTx.accountId },
        { amount: parseFloat(editForm.amount), description: editForm.description, category: editForm.category, date: editForm.date, accountId: editForm.accountId || undefined },
        newAccount?.type
      )
      toast.success('Transaction updated')
      setEditTx(null)
    } finally {
      setSaving(false)
    }
  }

  function handleExportCSV() {
    const rows = [
      ['Date', 'Type', 'Category', 'Description', 'Amount'],
      ...filtered.map((t) => [t.date, t.type, t.category, t.description, t.amount.toFixed(2)]),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `transactions-${selectedMonth}.csv`
    a.click()
  }

  async function handleDelete() {
    if (!householdId || !deleteId || !deleteTx || deleting) return
    setDeleting(true)
    try {
      const account = accounts.find((a) => a.id === deleteTx.accountId)
      await deleteTransaction(householdId, deleteId, deleteTx, account?.type)
      toast.success('Transaction deleted')
      setDeleteId(null)
      setDeleteTx(null)
    } finally {
      setDeleting(false)
    }
  }

  const editCategories = editTx?.type === 'income' ? incomeCategories : expenseCategories
  const net = income - expenses

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto pb-32">

      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 text-white shadow-xl">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">
              {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}
            </p>
            <p className="text-3xl font-bold tracking-tight">
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="text-white/60 hover:text-white hover:bg-white/10 h-9 w-9"
            title="Export CSV"
          >
            <Download size={16} />
          </Button>
        </div>

        <div className="flex gap-6 pt-4 border-t border-white/10">
          <div>
            <p className="text-xs text-white/40 mb-0.5">Income</p>
            <p className="text-sm font-bold text-emerald-400">+{formatCurrency(income, currency)}</p>
          </div>
          <div className="w-px bg-white/10" />
          <div>
            <p className="text-xs text-white/40 mb-0.5">Expenses</p>
            <p className="text-sm font-bold text-red-400">−{formatCurrency(expenses, currency)}</p>
          </div>
          <div className="w-px bg-white/10" />
          <div>
            <p className="text-xs text-white/40 mb-0.5">Net</p>
            <p className={cn('text-sm font-bold', net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net), currency)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v ?? 'all')}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-40"
        />
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <History size={32} strokeWidth={1.25} />
          <p className="text-sm">{search || filterType !== 'all' ? 'No matching transactions' : 'No transactions this month'}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
          {filtered.map((t) => {
            const isIncome = t.type === 'income'
            const account = accounts.find((a) => a.id === t.accountId)
            return (
              <li key={t.id} className="flex items-center justify-between px-4 py-3 gap-3 group hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                    isIncome ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'
                  )}>
                    {isIncome
                      ? <ArrowUpRight size={16} className="text-green-600 dark:text-green-400" />
                      : <ArrowDownRight size={16} className="text-red-600 dark:text-red-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate leading-tight">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{t.category}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{format(parseISO(t.date), 'MMM d')}</span>
                      {account && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground/70 truncate max-w-[80px]">{account.name}</span>
                        </>
                      )}
                      {!t.accountId && accounts.length > 0 && (
                        <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">unlinked</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <span className={cn('text-sm font-bold mr-1', isIncome ? 'text-green-600 dark:text-green-400' : 'text-foreground')}>
                    {isIncome ? '+' : '−'}{formatCurrency(t.amount, currency)}
                  </span>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => openEdit(t)}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => { setDeleteId(t.id); setDeleteTx(t) }}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <X size={13} />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* ── Edit dialog ── */}
      <Dialog open={editTx !== null} onOpenChange={(o) => !o && setEditTx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">{currency}</span>
                <Input
                  type="number" min="0" step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="pl-12"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v ?? '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {editCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
              </div>
            </div>
            {accounts.length > 0 && (
              <div className="space-y-1">
                <Label>Account</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {accounts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, accountId: a.id })}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${
                        editForm.accountId === a.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTx(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editForm.amount || saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete transaction?"
        description="This will also revert the account balance. Can't be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteId(null); setDeleteTx(null) }}
      />
    </div>
  )
}
