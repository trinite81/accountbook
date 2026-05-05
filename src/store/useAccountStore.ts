import { create } from 'zustand'
import type { Account, AccountType } from '@/types'
import { DEFAULT_ACCOUNTS } from '@/lib/defaultAccounts'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useBookStore } from '@/store/useBookStore'

interface NewAccountInput {
  name: string
  type: AccountType
  description?: string
  color?: string
  icon?: string
  startDate?: string
  endDate?: string
}

interface AccountStore {
  accounts: Account[]
  init: () => Promise<void>
  addAccount: (input: NewAccountInput) => void
  updateAccount: (id: string, updates: Partial<Omit<Account, 'id' | 'createdAt'>>) => void
  deleteAccount: (id: string) => void
  toggleActive: (id: string) => void
  resetToDefaults: () => void
  replaceAll: (accounts: Account[]) => void
  clearData: () => void
  getById: (id: string) => Account | undefined
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],

  async init() {
    const userId = useAuthStore.getState().user?.id
    const bookId = useBookStore.getState().book?.id
    if (!userId || !bookId) return

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: true })

    if (error) { console.error('[accounts] init error', error); return }

    if (!data || data.length === 0) {
      // 첫 로그인 — 기본 계정 생성
      const defaults: Account[] = DEFAULT_ACCOUNTS.map((a) => ({ ...a, bookId }))
      await supabase.from('accounts').insert(defaults.map((a) => toRow(a, userId)))
      set({ accounts: defaults })
    } else {
      set({ accounts: data.map(fromRow) })
    }
  },

  addAccount({ name, type, description, color = '#64748b', icon = 'more', startDate, endDate }) {
    const now = new Date().toISOString()
    const userId = useAuthStore.getState().user?.id
    const bookId = useBookStore.getState().book?.id ?? ''
    const account: Account = {
      id: generateId(),
      bookId,
      name,
      type,
      description,
      color,
      icon,
      isActive: true,
      isDefault: false,
      startDate: startDate ?? now.slice(0, 10),
      endDate,
      createdAt: now,
    }
    set({ accounts: [...get().accounts, account] })
    if (userId) supabase.from('accounts').insert(toRow(account, userId))
  },

  updateAccount(id, updates) {
    const next = get().accounts.map((a) => (a.id === id ? { ...a, ...updates } : a))
    set({ accounts: next })
    const userId = useAuthStore.getState().user?.id
    const account = next.find((a) => a.id === id)
    if (userId && account) {
      supabase.from('accounts').update(toRow(account, userId)).eq('id', id)
    }
  },

  deleteAccount(id) {
    set({ accounts: get().accounts.filter((a) => a.id !== id) })
    supabase.from('accounts').delete().eq('id', id)
  },

  toggleActive(id) {
    const next = get().accounts.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    set({ accounts: next })
    const account = next.find((a) => a.id === id)
    if (account) supabase.from('accounts').update({ is_active: account.isActive }).eq('id', id)
  },

  resetToDefaults() {
    const userId = useAuthStore.getState().user?.id
    const bookId = useBookStore.getState().book?.id
    if (!userId || !bookId) return
    const defaults: Account[] = DEFAULT_ACCOUNTS.map((a) => ({ ...a, bookId }))
    set({ accounts: defaults })
    supabase.from('accounts').delete().eq('book_id', bookId).then(() =>
      supabase.from('accounts').insert(defaults.map((a) => toRow(a, userId)))
    )
  },

  replaceAll(accounts) {
    const userId = useAuthStore.getState().user?.id
    const bookId = useBookStore.getState().book?.id
    if (!userId || !bookId) return
    set({ accounts })
    supabase.from('accounts').delete().eq('book_id', bookId).then(() =>
      supabase.from('accounts').insert(accounts.map((a) => toRow(a, userId)))
    )
  },

  clearData() {
    set({ accounts: [] })
  },

  getById(id) {
    return get().accounts.find((a) => a.id === id)
  },
}))

// ---------- DB 변환 ----------

function toRow(a: Account, userId: string) {
  return {
    id: a.id,
    book_id: a.bookId,
    user_id: userId,
    name: a.name,
    type: a.type,
    description: a.description ?? null,
    color: a.color,
    icon: a.icon,
    is_active: a.isActive,
    is_default: a.isDefault,
    start_date: a.startDate,
    end_date: a.endDate ?? null,
    created_at: a.createdAt,
  }
}

function fromRow(r: Record<string, unknown>): Account {
  return {
    id: r.id as string,
    bookId: r.book_id as string,
    name: r.name as string,
    type: r.type as AccountType,
    description: (r.description as string | null) ?? undefined,
    color: r.color as string,
    icon: r.icon as string,
    isActive: r.is_active as boolean,
    isDefault: r.is_default as boolean,
    startDate: r.start_date as string,
    endDate: (r.end_date as string | null) ?? undefined,
    createdAt: r.created_at as string,
  }
}
