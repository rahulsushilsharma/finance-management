export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string
  date: string
  accountId?: string
  addedBy?: string
}

export interface Budget {
  id: string
  category: string
  monthlyLimit: number
  month: string // 'YYYY-MM'
}

export type AccountType = 'bank' | 'cash' | 'credit' | 'investment' | 'asset'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
}
