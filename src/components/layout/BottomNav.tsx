import { NavLink } from 'react-router-dom'
import { LayoutDashboard, History, Target, BarChart2, Settings, Download, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { useState } from 'react'

const links = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/transactions', label: 'History', icon: History },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const { canInstall, install } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)
  const showBanner = canInstall && !dismissed

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      {showBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/10 border-t border-primary/20 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <Download size={14} className="text-primary shrink-0" />
            <span className="text-xs text-foreground font-medium truncate">Add to home screen for the best experience</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={install}
              className="text-xs font-semibold text-primary px-2.5 py-1 rounded-full bg-primary/15 hover:bg-primary/25 transition-colors"
            >
              Install
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
      <nav className="bg-background/95 backdrop-blur border-t border-border flex">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
