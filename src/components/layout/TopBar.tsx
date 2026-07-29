import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export function TopBar({ title }: { title: string }) {
  const { user } = useAuth()
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background gap-3">
      <h2 className="font-semibold text-foreground truncate">{title}</h2>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => setDark((d) => !d)}>
          {dark ? '☀️' : '🌙'}
        </Button>
        {user && (
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        )}
      </div>
    </header>
  )
}
