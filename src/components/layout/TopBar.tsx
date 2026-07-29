import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function TopBar({ title }: { title: string }) {
  const [dark, setDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
      <h2 className="font-semibold text-foreground">{title}</h2>
      <Button variant="outline" size="sm" onClick={() => setDark((d) => !d)}>
        {dark ? '☀️ Light' : '🌙 Dark'}
      </Button>
    </header>
  )
}
