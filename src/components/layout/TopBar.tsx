import { useEffect, useState } from 'react'
import { Sun, Moon, LogOut } from 'lucide-react'
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
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur gap-3 sticky top-0 z-30">
      <h2 className="font-semibold text-foreground truncate">{title}</h2>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} className="h-8 w-8">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
        {user && (
          <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <LogOut size={16} />
          </Button>
        )}
      </div>
    </header>
  )
}
