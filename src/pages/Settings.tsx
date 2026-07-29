import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Check, LogOut, UserMinus, Crown, User, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useHousehold } from '@/hooks/useHousehold'
import { signOut } from '@/lib/auth'
import {
  listenMembers,
  removeMember,
  leaveHousehold,
  deleteHousehold,
  transferAdmin,
  updateDisplayName,
  type Member,
} from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export function Settings() {
  const { user } = useAuth()
  const { householdId, setHouseholdId } = useHousehold()
  const navigate = useNavigate()

  const [members, setMembers] = useState<Member[]>([])
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // transfer admin dialog
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTo, setTransferTo] = useState('')
  const [transferring, setTransferring] = useState(false)

  const me = members.find((m) => m.uid === user?.uid)
  const isAdmin = me?.role === 'admin'
  const otherMembers = members.filter((m) => m.uid !== user?.uid)

  useEffect(() => {
    if (!householdId) return
    return listenMembers(householdId, setMembers)
  }, [householdId])

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

  async function handleRemove(uid: string) {
    if (!householdId) return
    await removeMember(householdId, uid)
  }

  // switch or leave household — clears householdId, goes back to onboarding
  async function handleSwitch() {
    if (!user || !householdId) return

    if (isAdmin && otherMembers.length > 0) {
      // must transfer admin first
      setTransferTo(otherMembers[0].uid)
      setTransferOpen(true)
      return
    }

    if (isAdmin && otherMembers.length === 0) {
      // sole member — delete household entirely
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

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-lg mx-auto">

      {/* profile */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{me?.displayName || user?.displayName || '—'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Display name</Label>
            <div className="flex gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
              <Button onClick={handleSaveName} disabled={saving || !displayName.trim()} size="sm">
                {saving ? '…' : 'Save'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* household / invite */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Household</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Invite code</Label>
            <div className="flex gap-2">
              <Input value={householdId ?? ''} readOnly className="font-mono text-xs text-muted-foreground" />
              <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Share this code with family members to join your household.</p>
          </div>
        </CardContent>
      </Card>

      {/* members */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2 px-0">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">No members found.</p>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li key={m.uid} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      m.role === 'admin' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-muted'
                    )}>
                      {m.role === 'admin'
                        ? <Crown size={14} className="text-amber-600 dark:text-amber-400" />
                        : <User size={14} className="text-muted-foreground" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.displayName}
                        {m.uid === user?.uid && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                  </div>
                  {isAdmin && m.uid !== user?.uid && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRemove(m.uid)}
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

      {/* account */}
      <Card className="border-border">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          <Button
            variant="outline"
            className="w-full gap-2 justify-start"
            onClick={handleSwitch}
          >
            <RefreshCw size={14} />
            Switch / leave household
          </Button>
          <Button variant="outline" className="w-full gap-2 justify-start" onClick={handleSignOut}>
            <LogOut size={14} /> Sign out
          </Button>
        </CardContent>
      </Card>

      {/* transfer admin dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer admin role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              You're the admin. Pick a new admin before leaving — they'll manage the household.
            </p>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">New admin</Label>
              <Select value={transferTo} onValueChange={(v) => setTransferTo(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {otherMembers.map((m) => (
                    <SelectItem key={m.uid} value={m.uid}>{m.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!transferTo || transferring}
              onClick={handleTransferAndLeave}
            >
              {transferring ? 'Leaving…' : 'Transfer & leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
