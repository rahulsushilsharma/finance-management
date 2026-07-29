import { useEffect, useState } from 'react'
import { getUserHouseholdId } from '@/lib/firestore'
import { useAuth } from './useAuth'

interface HouseholdState {
  householdId: string | null
  loading: boolean
  setHouseholdId: (id: string | null) => void
}

export function useHousehold(): HouseholdState {
  const { user } = useAuth()
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setHouseholdId(null)
      setLoading(false)
      return
    }
    setLoading(true)
    getUserHouseholdId(user.uid).then((id) => {
      setHouseholdId(id)
      setLoading(false)
    })
  }, [user])

  return { householdId, loading, setHouseholdId }
}
