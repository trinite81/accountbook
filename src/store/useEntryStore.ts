import { create } from 'zustand'
import type { JournalEntry, JournalEntryLine } from '@/types'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useBookStore } from '@/store/useBookStore'

interface EntryStore {
  entries: JournalEntry[]
  init: () => Promise<void>
  addEntry: (date: string, description: string, lines: JournalEntryLine[]) => void
  addEntries: (entries: Omit<JournalEntry, 'bookId' | 'userId'>[]) => void
  addSharedEntries: (entries: Omit<JournalEntry, 'bookId'>[]) => void
  updateEntry: (id: string, date: string, description: string, lines: JournalEntryLine[]) => void
  deleteEntry: (id: string) => void
  replaceAll: (entries: JournalEntry[]) => void
  clearData: () => void
}

export const useEntryStore = create<EntryStore>((set, get) => ({
  entries: [],

  async init() {
    const bookId = useBookStore.getState().book?.id
    if (!bookId) return

    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('book_id', bookId)
      .order('date', { ascending: false })

    if (error) { console.error('[entries] init error', error); return }
    set({ entries: (data ?? []).map(fromRow) })
  },

  addEntry(date, description, lines) {
    const now = new Date().toISOString()
    const userId = useAuthStore.getState().user?.id ?? ''
    const bookId = useBookStore.getState().book?.id ?? ''
    const entry: JournalEntry = { id: generateId(), bookId, userId, date, description, lines, createdAt: now, updatedAt: now }
    set({ entries: [entry, ...get().entries] })
    if (userId) supabase.from('entries').insert(toRow(entry, userId))
  },

  addEntries(newEntries) {
    const userId = useAuthStore.getState().user?.id ?? ''
    const bookId = useBookStore.getState().book?.id ?? ''
    const full: JournalEntry[] = newEntries.map((e) => ({ ...e, bookId, userId }))
    const next = [...full, ...get().entries].sort((a, b) => b.date.localeCompare(a.date))
    set({ entries: next })
    if (userId) supabase.from('entries').insert(full.map((e) => toRow(e, userId)))
  },

  addSharedEntries(newEntries) {
    const bookId = useBookStore.getState().book?.id ?? ''
    const currentUserId = useAuthStore.getState().user?.id ?? ''
    if (!currentUserId) return
    const full: JournalEntry[] = newEntries.map((e) => ({ ...e, bookId }))
    const next = [...full, ...get().entries].sort((a, b) => b.date.localeCompare(a.date))
    set({ entries: next })
    // RLS INSERT 정책은 book_id 멤버십만 확인하므로 다른 userId 행도 삽입 가능
    supabase.from('entries').insert(full.map((e) => toRow(e, e.userId)))
  },

  updateEntry(id, date, description, lines) {
    const updatedAt = new Date().toISOString()
    const next = get().entries.map((e) =>
      e.id === id ? { ...e, date, description, lines, updatedAt } : e
    )
    set({ entries: next })
    supabase.from('entries').update({ date, description, lines, updated_at: updatedAt }).eq('id', id)
  },

  deleteEntry(id) {
    set({ entries: get().entries.filter((e) => e.id !== id) })
    supabase.from('entries').delete().eq('id', id)
  },

  replaceAll(entries) {
    const userId = useAuthStore.getState().user?.id
    const bookId = useBookStore.getState().book?.id
    if (!userId || !bookId) return
    set({ entries })
    supabase.from('entries').delete().eq('book_id', bookId).then(() =>
      supabase.from('entries').insert(entries.map((e) => toRow(e, userId)))
    )
  },

  clearData() {
    set({ entries: [] })
  },
}))

// ---------- DB 변환 ----------

function toRow(e: JournalEntry, userId: string) {
  return {
    id: e.id,
    book_id: e.bookId,
    user_id: userId,
    date: e.date,
    description: e.description,
    lines: e.lines,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  }
}

function fromRow(r: Record<string, unknown>): JournalEntry {
  return {
    id: r.id as string,
    bookId: r.book_id as string,
    userId: r.user_id as string,
    date: r.date as string,
    description: r.description as string,
    lines: r.lines as JournalEntryLine[],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}
