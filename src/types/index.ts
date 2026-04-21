export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export interface Account {
  id: string
  name: string
  type: AccountType
  description?: string
  color: string
  icon: string
  isActive: boolean
  isDefault: boolean
  createdAt: string
}

export interface JournalEntryLine {
  accountId: string
  debit: number
  credit: number
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

export const ACCOUNT_TYPE_BADGE_CLASSES: Record<AccountType, string> = {
  asset: 'bg-blue-100 text-blue-700',
  liability: 'bg-red-100 text-red-700',
  equity: 'bg-purple-100 text-purple-700',
  revenue: 'bg-green-100 text-green-700',
  expense: 'bg-orange-100 text-orange-700',
}
