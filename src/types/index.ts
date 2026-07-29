export type TransactionType = 'income' | 'expense'
export type AccountLabel = 'cash' | 'bank' | 'card'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string
  date: string
  accountLabel?: AccountLabel
}

export interface Budget {
  id: string
  category: string
  monthlyLimit: number
  month: string // 'YYYY-MM'
}
