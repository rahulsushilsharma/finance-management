import { useState } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, useLocation, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { useHousehold } from '@/hooks/useHousehold'
import { DataProvider } from '@/hooks/useData'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { QuickAdd } from '@/components/QuickAdd'
import { Login } from '@/pages/Login'
import { Household } from '@/pages/Household'
import { Dashboard } from '@/pages/Dashboard'
import { Transactions } from '@/pages/Transactions'
import { Budgets } from '@/pages/Budgets'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
}

function Layout() {
  const { pathname } = useLocation()
  const { user, loading: authLoading } = useAuth()
  const { householdId, loading: hhLoading, setHouseholdId } = useHousehold()
  const [addOpen, setAddOpen] = useState(false)

  if (authLoading || hhLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
  }

  if (!user) return <Navigate to="/login" replace />
  if (!householdId) return <Household onJoined={setHouseholdId} />

  return (
    <DataProvider>
      <div className="flex min-h-screen bg-background">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar title={PAGE_TITLES[pathname] ?? 'Finance'} />
          <main className="flex-1 overflow-auto pb-24 md:pb-6">
            <Outlet />
          </main>
        </div>
        <BottomNav />
        <button
          onClick={() => setAddOpen(true)}
          className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl active:scale-95 transition-transform hover:opacity-90"
          aria-label="Add transaction"
        >
          +
        </button>
        <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} />
      </div>
    </DataProvider>
  )
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <PublicRoute><Login /></PublicRoute>,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'transactions', element: <Transactions /> },
      { path: 'budgets', element: <Budgets /> },
    ],
  },
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
