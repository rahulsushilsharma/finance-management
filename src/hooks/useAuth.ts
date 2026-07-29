import { createContext, useContext, useEffect, useState, type ReactNode, createElement } from 'react'
import type { User } from 'firebase/auth'
import { onAuthChange } from '@/lib/auth'

interface AuthCtx {
  user: User | null
  loading: boolean
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return createElement(Ctx.Provider, { value: { user, loading } }, children)
}

export const useAuth = () => useContext(Ctx)
