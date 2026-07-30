import { useState } from 'react'
import { PiggyBank, Landmark, Wallet, CreditCard, TrendingUp, ChevronRight } from 'lucide-react'
import { useHousehold } from '@/hooks/useHousehold'
import { addAccount } from '@/lib/firestore'
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
import type { AccountType } from '@/types'

const PRESETS: { label: string; type: AccountType; icon: React.ReactNode; placeholder: string }[] = [
  { label: 'Savings account', type: 'bank', icon: <Landmark size={18} />, placeholder: 'e.g. HDFC Savings' },
  { label: 'Cash', type: 'cash', icon: <Wallet size={18} />, placeholder: 'e.g. Wallet cash' },
  { label: 'Credit card', type: 'credit', icon: <CreditCard size={18} />, placeholder: 'e.g. Axis Credit Card' },
  { label: 'Investment', type: 'investment', icon: <TrendingUp size={18} />, placeholder: 'e.g. Mutual Funds' },
]

export function AccountSetup() {
  const { householdId } = useHousehold()
  const [selected, setSelected] = useState<typeof PRESETS[0] | null>(null)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [type, setType] = useState<AccountType>('bank')
  const [saving, setSaving] = useState(false)

  function selectPreset(preset: typeof PRESETS[0]) {
    setSelected(preset)
    setType(preset.type)
    setName('')
    setBalance('')
  }

  async function handleAdd() {
    if (!householdId || !name.trim() || balance === '') return
    setSaving(true)
    await addAccount(householdId, { name: name.trim(), type, balance: parseFloat(balance) })
    setSaving(false)
    // accounts.length will become > 0, Layout will unmount this and show the app
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <PiggyBank size={28} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold">Track your net worth</h1>
          <p className="text-sm text-muted-foreground">
            Add your accounts so the app can calculate your net worth and keep balances up to date automatically.
          </p>
        </div>

        {/* preset chips */}
        {!selected ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pick an account to add</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => selectPreset(p)}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted active:scale-95 transition-all text-left"
                >
                  <span className="text-primary">{p.icon}</span>
                  <span className="text-sm font-medium">{p.label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground gap-1"
              onClick={() => selectPreset(PRESETS[0])}
            >
              Add custom account <ChevronRight size={14} />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-primary underline underline-offset-2"
            >
              ← Back to presets
            </button>

            <div className="space-y-1">
              <Label>Account name</Label>
              <Input
                autoFocus
                placeholder={selected.placeholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType((v ?? 'bank') as AccountType)}>
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
              <Label>{type === 'credit' ? 'Amount currently owed' : 'Current balance'}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
              {type === 'credit' && (
                <p className="text-xs text-muted-foreground">Enter what you owe on this card right now.</p>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!name.trim() || balance === '' || saving}
              onClick={handleAdd}
            >
              {saving ? 'Adding…' : 'Add account'}
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          You can add more accounts anytime in{' '}
          <span className="font-medium">Settings → Accounts & Assets</span>
        </p>
      </div>
    </div>
  )
}
