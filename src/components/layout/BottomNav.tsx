import { NavLink } from 'react-router-dom'
import { LayoutDashboard, History, Target, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/transactions', label: 'History', icon: History },
  { to: '/budgets', label: 'Budgets', icon: Target },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
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
