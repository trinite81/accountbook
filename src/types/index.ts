export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export interface Account {
  id: string
  name: string
  type: AccountType
  description?: string
  isDefault: boolean
  createdAt: string
}

export interface JournalEntryLine {
  accountId: string
  debit: number
  credit: number
  memo?: string
}

export interface JournalEntry {
  id: string
  date: string
  description: string
  lines: JournalEntryLine[]
  createdAt: string
  updatedAt: string
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: '자산',
  liability: '부채',
  equity: '자본',
  revenue: '수익',
  expense: '비용',
}

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  asset: 'text-blue-600',
  liability: 'text-red-600',
  equity: 'text-purple-600',
  revenue: 'text-green-600',
  expense: 'text-orange-600',
}
