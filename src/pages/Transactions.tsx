import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowUpRight, ArrowDownRight, Search, History, Pencil, Download } from 'lucide-react'
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
  const { transactions, expenseCategories, incomeCategories, loading } = useData()
  const { householdId } = useHousehold()
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState({ amount: '', description: '', category: '', date: '' })

  const filtered = transactions
    .filter((t) => filterType === 'all' || t.type === filterType)
    .filter(
      (t) =>
        !search ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  function openEdit(t: Transaction) {
    setEditTx(t)
    setEditForm({ amount: String(t.amount), description: t.description, category: t.category, date: t.date })
  }

  async function handleEdit() {
    if (!householdId || !editTx) return
    await updateTransaction(householdId, editTx.id, {
      amount: parseFloat(editForm.amount),
      description: editForm.description,
      category: editForm.category,
      date: editForm.date,
    })
    toast.success('Transaction updated')
    setEditTx(null)
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
    if (!householdId || !deleteId) return
    await deleteTransaction(householdId, deleteId)
    toast.success('Transaction deleted')
    setDeleteId(null)
  }

  const editCategories = editTx?.type === 'income' ? incomeCategories : expenseCategories

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto pb-32">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v ?? 'all')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
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
        <Button variant="outline" size="icon" onClick={handleExportCSV} title="Export CSV" disabled={filtered.length === 0}>
          <Download size={15} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <History size={32} strokeWidth={1.25} />
          <p className="text-sm">No transactions found</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
          {filtered.map((t) => {
            const isIncome = t.type === 'income'
            return (
              <li key={t.id} className="flex items-center justify-between px-4 py-3 gap-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                    isIncome ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'
                  )}>
                    {isIncome
                      ? <ArrowUpRight size={16} className="text-green-600 dark:text-green-400" />
                      : <ArrowDownRight size={16} className="text-red-600 dark:text-red-400" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate leading-tight">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">{t.category}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(t.date), 'MMM d')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={cn(
                    'text-sm font-bold',
                    isIncome ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                  )}>
                    {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(t)}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(t.id)}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    ✕
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Edit dialog */}
      <Dialog open={editTx !== null} onOpenChange={(o) => !o && setEditTx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
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
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTx(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editForm.amount}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete transaction?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
