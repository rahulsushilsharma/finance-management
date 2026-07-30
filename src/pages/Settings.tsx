import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, LogOut, UserMinus, Crown, User, RefreshCw, Plus, X, Pencil, Shield, Share2, RepeatIcon, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useHousehold } from '@/hooks/useHousehold'
import { useData } from '@/hooks/useData'
import { signOut } from '@/lib/auth'
import {
  listenMembers,
  removeMember,
  leaveHousehold,
  deleteHousehold,
  transferAdmin,
  updateDisplayName,
  updateCustomCategories,
  updateCurrency,
  addAccount,
  updateAccount,
  deleteAccount,
  addRecurring,
  deleteRecurring,
  updateRecurring,
  type Member,
} from '@/lib/firestore'
import type { Account, AccountType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatCurrency, cn } from '@/lib/utils'

const DEFAULT_EXPENSE = ['Food','Transport','Housing','Health','Entertainment','Education','Shopping','Other']
const DEFAULT_INCOME = ['Salary','Freelance','Investment','Gift','Other']

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  bank: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  cash: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  credit: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  investment: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  asset: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
}

export function Settings() {
  const { user } = useAuth()
  const { householdId, setHouseholdId } = useHousehold()
  const navigate = useNavigate()

  const [members, setMembers] = useState<Member[]>([])
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTo, setTransferTo] = useState('')
  const [transferring, setTransferring] = useState(false)

  const { expenseCategories, incomeCategories, accounts, currency, recurring } = useData()
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense')
  const [newCatName, setNewCatName] = useState('')

  const [accountForm, setAccountForm] = useState<{ name: string; type: AccountType; balance: string }>({ name: '', type: 'bank', balance: '' })
  const [editAccountId, setEditAccountId] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null)

  const [recurringOpen, setRecurringOpen] = useState(false)
  const [recurringForm, setRecurringForm] = useState<{
    type: 'income' | 'expense'; amount: string; description: string; category: string; accountId: string; dayOfMonth: string
  }>({ type: 'expense', amount: '', description: '', category: '', accountId: '', dayOfMonth: '1' })

  const me = members.find((m) => m.uid === user?.uid)
  const isAdmin = me?.role === 'admin'
  const otherMembers = members.filter((m) => m.uid !== user?.uid)

  const totalAssets = accounts.filter((a) => a.type !== 'credit').reduce((s, a) => s + a.balance, 0)
  const totalLiabilities = accounts.filter((a) => a.type === 'credit').reduce((s, a) => s + a.balance, 0)
  const netWorth = totalAssets - totalLiabilities

  useEffect(() => {
    if (!householdId) return
    return listenMembers(householdId, setMembers)
  }, [householdId])

  function openAddAccount() {
    setEditAccountId(null)
    setAccountForm({ name: '', type: 'bank', balance: '' })
    setAccountOpen(true)
  }

  function openEditAccount(a: Account) {
    setEditAccountId(a.id)
    setAccountForm({ name: a.name, type: a.type, balance: String(a.balance) })
    setAccountOpen(true)
  }

  async function handleAccountSubmit() {
    if (!householdId || !accountForm.name || accountForm.balance === '') return
    const data = { name: accountForm.name, type: accountForm.type, balance: parseFloat(accountForm.balance) }
    if (editAccountId) await updateAccount(householdId, editAccountId, data)
    else await addAccount(householdId, data)
    setAccountOpen(false)
  }

  async function handleDeleteAccount() {
    if (!householdId || !deleteAccountId) return
    await deleteAccount(householdId, deleteAccountId)
    setDeleteAccountId(null)
  }

  async function handleSaveName() {
    if (!user || !householdId || !displayName.trim()) return
    setSaving(true)
    await updateDisplayName(user.uid, householdId, displayName.trim())
    setSaving(false)
  }

  function handleCopy() {
    if (!householdId) return
    navigator.clipboard.writeText(householdId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShare() {
    if (!householdId) return
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      navigator.share({ title: 'Join our household', text: householdId })
    } else {
      handleCopy()
    }
  }

  async function handleRecurringSubmit() {
    if (!householdId || !recurringForm.description || !recurringForm.amount || !recurringForm.category) return
    await addRecurring(householdId, {
      type: recurringForm.type,
      amount: parseFloat(recurringForm.amount),
      description: recurringForm.description,
      category: recurringForm.category,
      dayOfMonth: Math.min(28, Math.max(1, parseInt(recurringForm.dayOfMonth) || 1)),
      active: true,
      ...(recurringForm.accountId ? { accountId: recurringForm.accountId } : {}),
    })
    setRecurringForm({ type: 'expense', amount: '', description: '', category: '', accountId: '', dayOfMonth: '1' })
    setRecurringOpen(false)
  }

  async function handleSwitch() {
    if (!user || !householdId) return
    if (isAdmin && otherMembers.length > 0) {
      setTransferTo(otherMembers[0].uid)
      setTransferOpen(true)
      return
    }
    if (isAdmin && otherMembers.length === 0) {
      await deleteHousehold(user.uid, householdId)
    } else {
      await leaveHousehold(user.uid, householdId)
    }
    setHouseholdId(null)
    navigate('/')
  }

  async function handleTransferAndLeave() {
    if (!user || !householdId || !transferTo) return
    setTransferring(true)
    await transferAdmin(householdId, user.uid, transferTo)
    await leaveHousehold(user.uid, householdId)
    setTransferOpen(false)
    setHouseholdId(null)
    navigate('/')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  async function handleAddCategory() {
    if (!householdId || !newCatName.trim()) return
    const name = newCatName.trim()
    const customExpense = expenseCategories.filter((c) => !DEFAULT_EXPENSE.includes(c))
    const customIncome = incomeCategories.filter((c) => !DEFAULT_INCOME.includes(c))
    if (newCatType === 'expense') {
      await updateCustomCategories(householdId, { expense: [...customExpense, name], income: customIncome })
    } else {
      await updateCustomCategories(householdId, { expense: customExpense, income: [...customIncome, name] })
    }
    setNewCatName('')
  }

  async function handleRemoveCategory(name: string, type: 'expense' | 'income') {
    if (!householdId) return
    const customExpense = expenseCategories.filter((c) => !DEFAULT_EXPENSE.includes(c))
    const customIncome = incomeCategories.filter((c) => !DEFAULT_INCOME.includes(c))
    if (type === 'expense') {
      await updateCustomCategories(householdId, { expense: customExpense.filter((c) => c !== name), income: customIncome })
    } else {
      await updateCustomCategories(householdId, { expense: customExpense, income: customIncome.filter((c) => c !== name) })
    }
  }

  const customExpense = expenseCategories.filter((c) => !DEFAULT_EXPENSE.includes(c))
  const customIncome = incomeCategories.filter((c) => !DEFAULT_INCOME.includes(c))

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-lg mx-auto pb-16">

      {/* ── Profile Hero ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 text-white shadow-xl">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-slate-600/20 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <User size={24} className="text-white/70" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-lg leading-tight truncate">{me?.displayName || user?.displayName || '—'}</p>
            <p className="text-xs text-white/50 truncate">{user?.email}</p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                <Crown size={9} /> Admin
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm h-9"
          />
          <Button
            onClick={handleSaveName}
            disabled={saving || !displayName.trim()}
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-0 shrink-0"
          >
            {saving ? '…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* ── Accounts & Assets ── */}
      <Card>
        <CardHeader className="pb-3 pt-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accounts & Assets</CardTitle>
          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={openAddAccount}>
            <Plus size={12} /> Add
          </Button>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          {accounts.length > 0 && (
            <div className="flex gap-4 p-3 rounded-xl bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">Net Worth</p>
                <p className={cn('text-sm font-bold', netWorth >= 0 ? 'text-foreground' : 'text-red-500')}>
                  {formatCurrency(netWorth, currency)}
                </p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Assets</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalAssets, currency)}</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Debt</p>
                <p className="text-sm font-bold text-red-500">{formatCurrency(totalLiabilities, currency)}</p>
              </div>
            </div>
          )}

          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No accounts yet.</p>
          ) : (
            <ul className="divide-y divide-border -mx-0 rounded-xl border border-border overflow-hidden">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-3 gap-3 bg-card">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0', ACCOUNT_TYPE_COLORS[a.type])}>
                      {a.type}
                    </span>
                    <p className="text-sm font-medium truncate">{a.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-sm font-semibold', a.type === 'credit' ? 'text-red-500' : 'text-foreground')}>
                      {a.type === 'credit' ? '−' : ''}{formatCurrency(Math.abs(a.balance), currency)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEditAccount(a)}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteAccountId(a.id)}>
                      <X size={13} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Household ── */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Household</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Invite code</Label>
            <div className="flex gap-2">
              <Input value={householdId ?? ''} readOnly className="font-mono text-xs text-muted-foreground" />
              <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 gap-1.5">
                {copied ? <><Check size={13} className="text-green-500" /> Copied</> : <><Copy size={13} /> Copy</>}
              </Button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button variant="outline" size="sm" onClick={handleShare} className="shrink-0 gap-1.5">
                  <Share2 size={13} /> Share
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Share with family members to join your household.</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Currency</Label>
            <Select value={currency} onValueChange={(v) => householdId && v && updateCurrency(householdId, v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                <SelectItem value="INR">INR — Indian Rupee (₹)</SelectItem>
                <SelectItem value="EUR">EUR — Euro (€)</SelectItem>
                <SelectItem value="GBP">GBP — British Pound (£)</SelectItem>
                <SelectItem value="JPY">JPY — Japanese Yen (¥)</SelectItem>
                <SelectItem value="CAD">CAD — Canadian Dollar (CA$)</SelectItem>
                <SelectItem value="AUD">AUD — Australian Dollar (A$)</SelectItem>
                <SelectItem value="SGD">SGD — Singapore Dollar (S$)</SelectItem>
                <SelectItem value="AED">AED — UAE Dirham (د.إ)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Applies to all members in this household.</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Members ── */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2 px-0">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">Loading members…</p>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li key={m.uid} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                      m.role === 'admin'
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {m.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{m.displayName}</p>
                        {m.uid === user?.uid && <span className="text-[10px] text-muted-foreground">(you)</span>}
                        {m.role === 'admin' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <Crown size={9} /> Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                  </div>
                  {isAdmin && m.uid !== user?.uid && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeMember(householdId!, m.uid)}
                    >
                      <UserMinus size={14} />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Custom Categories ── */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Custom Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="flex gap-2">
            <Select value={newCatType} onValueChange={(v) => setNewCatType((v ?? 'expense') as 'expense' | 'income')}>
              <SelectTrigger className="w-28 shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Category name"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Button size="icon" variant="outline" onClick={handleAddCategory} disabled={!newCatName.trim()}>
              <Plus size={15} />
            </Button>
          </div>
          {customExpense.length === 0 && customIncome.length === 0 ? (
            <p className="text-xs text-muted-foreground">No custom categories yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {customExpense.map((c) => (
                <div key={c} className="flex items-center gap-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900/50">
                  <span>{c}</span>
                  <button onClick={() => handleRemoveCategory(c, 'expense')} className="ml-0.5 opacity-60 hover:opacity-100"><X size={10} /></button>
                </div>
              ))}
              {customIncome.map((c) => (
                <div key={c} className="flex items-center gap-1 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 text-xs px-2.5 py-1 rounded-full border border-green-200 dark:border-green-900/50">
                  <span>{c}</span>
                  <button onClick={() => handleRemoveCategory(c, 'income')} className="ml-0.5 opacity-60 hover:opacity-100"><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recurring Transactions ── */}
      <Card>
        <CardHeader className="pb-3 pt-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <RepeatIcon size={12} /> Recurring Transactions
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setRecurringOpen(true)}>
            <Plus size={12} /> Add
          </Button>
        </CardHeader>
        <CardContent className="pb-4 space-y-2">
          {recurring.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recurring transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {recurring.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-3 gap-3 bg-card">
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={(e) => householdId && updateRecurring(householdId, r.id, { active: e.target.checked })}
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.description}</p>
                      <p className="text-xs text-muted-foreground">{r.category} · Day {r.dayOfMonth}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-sm font-semibold', r.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>
                      {r.type === 'income' ? '+' : '−'}{formatCurrency(r.amount, currency)}
                    </span>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => householdId && deleteRecurring(householdId, r.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Danger zone ── */}
      <Card className="border-border">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Shield size={12} /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          <Button variant="outline" className="w-full gap-2 justify-start" onClick={handleSwitch}>
            <RefreshCw size={14} /> Switch / leave household
          </Button>
          <Button variant="outline" className="w-full gap-2 justify-start text-destructive hover:text-destructive" onClick={() => setSignOutOpen(true)}>
            <LogOut size={14} /> Sign out
          </Button>
        </CardContent>
      </Card>

      {/* ── Dialogs ── */}
      <Dialog open={accountOpen} onOpenChange={(o) => !o && setAccountOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editAccountId ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="HDFC Savings, Cash, Axis CC…" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={accountForm.type} onValueChange={(v) => setAccountForm({ ...accountForm, type: (v ?? 'bank') as AccountType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank account</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit">Credit card</SelectItem>
                  <SelectItem value="investment">Investment (MF, stocks)</SelectItem>
                  <SelectItem value="asset">Other asset (property, gold)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{accountForm.type === 'credit' ? 'Amount owed' : 'Current balance'}</Label>
              <Input type="number" min="0" step="0.01" placeholder="0" value={accountForm.balance} onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })} />
              {accountForm.type === 'credit' && <p className="text-xs text-muted-foreground">Enter what you currently owe.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountOpen(false)}>Cancel</Button>
            <Button onClick={handleAccountSubmit} disabled={!accountForm.name || accountForm.balance === ''}>{editAccountId ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteAccountId !== null}
        title="Delete account?"
        description="This won't modify your existing transactions."
        confirmLabel="Delete"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteAccountId(null)}
      />

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer admin role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Pick a new admin before leaving. They'll manage the household.</p>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">New admin</Label>
              <Select value={transferTo} onValueChange={(v) => setTransferTo(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {otherMembers.map((m) => <SelectItem key={m.uid} value={m.uid}>{m.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!transferTo || transferring} onClick={handleTransferAndLeave}>
              {transferring ? 'Leaving…' : 'Transfer & leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={signOutOpen}
        title="Sign out?"
        description="You'll need to sign in again to access your data."
        confirmLabel="Sign out"
        onConfirm={handleSignOut}
        onCancel={() => setSignOutOpen(false)}
      />

      <Dialog open={recurringOpen} onOpenChange={setRecurringOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Recurring Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={recurringForm.type} onValueChange={(v) => setRecurringForm({ ...recurringForm, type: (v ?? 'expense') as 'income' | 'expense', category: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input placeholder="Netflix, Rent, Salary…" value={recurringForm.description} onChange={(e) => setRecurringForm({ ...recurringForm, description: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={recurringForm.amount} onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={recurringForm.category} onValueChange={(v) => setRecurringForm({ ...recurringForm, category: v ?? '' })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {(recurringForm.type === 'expense' ? expenseCategories : incomeCategories).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Account (optional)</Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setRecurringForm({ ...recurringForm, accountId: '' })}
                  className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', recurringForm.accountId === '' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground')}
                >
                  None
                </button>
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setRecurringForm({ ...recurringForm, accountId: a.id })}
                    className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', recurringForm.accountId === a.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground')}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Day of month (1–28)</Label>
              <Input type="number" min="1" max="28" value={recurringForm.dayOfMonth} onChange={(e) => setRecurringForm({ ...recurringForm, dayOfMonth: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecurringOpen(false)}>Cancel</Button>
            <Button onClick={handleRecurringSubmit} disabled={!recurringForm.description || !recurringForm.amount || !recurringForm.category}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
