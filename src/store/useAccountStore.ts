import { create } from 'zustand'
import type { Account, AccountType } from '@/types'
import { getAccounts, saveAccounts } from '@/lib/storage'
import { DEFAULT_ACCOUNTS } from '@/lib/defaultAccounts'
import { generateId } from '@/lib/utils'

interface AccountStore {
  accounts: Account[]
  init: () => void
  addAccount: (name: string, type: AccountType, description?: string) => void
  updateAccount: (id: string, updates: Partial<Pick<Account, 'name' | 'description'>>) => void
  deleteAccount: (id: string) => void
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
      set({ accounts: stored })
    }
  },

  addAccount(name, type, description) {
    const account: Account = {
      id: generateId(),
      name,
      type,
      description,
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

  getById(id) {
    return get().accounts.find((a) => a.id === id)
  },
}))
