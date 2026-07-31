import { useEffect, useState } from 'react'
import { Sun, Moon, LogOut, Download } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export function TopBar({ title }: { title: string }) {
  const { user } = useAuth()
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const { canInstall, install } = usePWAInstall()
  const [tip, setTip] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  function handleInstallClick() {
    if (canInstall) {
      install()
    } else {
      setTip((v) => !v)
    }
  }

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur gap-3 sticky top-0 z-30">
      <h2 className="font-semibold text-foreground truncate">{title}</h2>
      <div className="flex items-center gap-1 shrink-0 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleInstallClick}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8 px-2"
          title="Install app"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Install</span>
        </Button>
        {tip && (
          <div className="absolute top-10 right-0 z-50 w-56 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg p-3 text-xs leading-relaxed">
            {/iphone|ipad|ipod/i.test(navigator.userAgent)
              ? <>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></>
              : <>Open browser menu → <strong>Install app</strong> or <strong>Add to home screen</strong></>
            }
            <button onClick={() => setTip(false)} className="block mt-2 text-primary underline">Got it</button>
          </div>
        )}
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
