import { create } from 'zustand'
import type { Account, AccountType } from '@/types'
import { getAccounts, saveAccounts } from '@/lib/storage'
import { DEFAULT_ACCOUNTS } from '@/lib/defaultAccounts'
import { generateId } from '@/lib/utils'

interface NewAccountInput {
  name: string
  type: AccountType
  description?: string
  color?: string
  icon?: string
}

interface AccountStore {
  accounts: Account[]
  init: () => void
  addAccount: (input: NewAccountInput) => void
  updateAccount: (id: string, updates: Partial<Omit<Account, 'id' | 'createdAt'>>) => void
  deleteAccount: (id: string) => void
  toggleActive: (id: string) => void
  resetToDefaults: () => void
  replaceAll: (accounts: Account[]) => void
  getById: (id: string) => Account | undefined
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],

  init() {
    const stored = getAccounts()
    if (stored.length === 0) {
      saveAccounts(DEFAULT_ACCOUNTS)
      set({ accounts: DEFAULT_ACCOUNTS })
    } else {
      // migrate old accounts that lack new fields
      const migrated = stored.map((a) => ({
        ...a,
        color: a.color ?? '#64748b',
        icon: a.icon ?? 'more',
        isActive: a.isActive ?? true,
      }))
      saveAccounts(migrated)
      set({ accounts: migrated })
    }
  },

  addAccount({ name, type, description, color = '#64748b', icon = 'more' }) {
    const account: Account = {
      id: generateId(),
      name,
      type,
      description,
      color,
      icon,
      isActive: true,
      isDefault: false,
      createdAt: new Date().toISOString(),
    }
    const next = [...get().accounts, account]
    saveAccounts(next)
    set({ accounts: next })
  },

  updateAccount(id, updates) {
    const next = get().accounts.map((a) => (a.id === id ? { ...a, ...updates } : a))
    saveAccounts(next)
    set({ accounts: next })
  },

  deleteAccount(id) {
    const next = get().accounts.filter((a) => a.id !== id)
    saveAccounts(next)
    set({ accounts: next })
  },

  toggleActive(id) {
    const next = get().accounts.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    saveAccounts(next)
    set({ accounts: next })
  },

  resetToDefaults() {
    saveAccounts(DEFAULT_ACCOUNTS)
    set({ accounts: DEFAULT_ACCOUNTS })
  },

  replaceAll(accounts) {
    saveAccounts(accounts)
    set({ accounts })
  },

  getById(id) {
    return get().accounts.find((a) => a.id === id)
  },
}))
