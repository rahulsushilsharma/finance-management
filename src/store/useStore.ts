import { create } from 'zustand'
import { currentMonth } from '@/lib/utils'

interface UIStore {
  selectedMonth: string
  setSelectedMonth: (m: string) => void
}

export const useStore = create<UIStore>()((set) => ({
  selectedMonth: currentMonth(),
  setSelectedMonth: (m) => set({ selectedMonth: m }),
}))
