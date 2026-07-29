import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { createHousehold, joinHousehold } from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Household({ onJoined }: { onJoined: (id: string) => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const displayName = user?.displayName || user?.email || 'Member'
  const email = user?.email || ''

  async function handleCreate() {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const hid = await createHousehold(user.uid, displayName, email)
      onJoined(hid)
      navigate('/')
    } catch {
      setError('Failed to create household.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!user || !code.trim()) return
    setLoading(true)
    setError('')
    try {
      const ok = await joinHousehold(user.uid, code.trim(), displayName, email)
      if (!ok) { setError('Invalid invite code.'); return }
      onJoined(code.trim())
      navigate('/')
    } catch {
      setError('Failed to join household.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">Set up your household</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new one or join an existing family
          </p>
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t === 'create' ? 'Create new' : 'Join existing'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              A new household will be created for your family. You'll get an invite code to share.
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleCreate} disabled={loading}>
              Create household
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Invite code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste code from family member"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleJoin} disabled={loading || !code.trim()}>
              Join household
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
