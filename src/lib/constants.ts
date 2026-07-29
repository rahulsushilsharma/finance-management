export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Housing',
  'Health',
  'Entertainment',
  'Education',
  'Shopping',
  'Other',
] as const

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'] as const

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES] as const

export const ACCOUNT_LABELS = ['cash', 'bank', 'card'] as const
