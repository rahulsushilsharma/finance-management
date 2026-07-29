import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Home', icon: '📊' },
  { to: '/transactions', label: 'History', icon: '💳' },
  { to: '/budgets', label: 'Budgets', icon: '🎯' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border flex md:hidden">
      {links.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center justify-center py-3 text-xs gap-1 transition-colors',
              isActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground'
            )
          }
        >
          <span className="text-xl leading-none">{icon}</span>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
