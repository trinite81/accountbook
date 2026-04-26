import { create } from 'zustand'
import type { JournalEntry, JournalEntryLine } from '@/types'
import { generateId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

interface EntryStore {
  entries: JournalEntry[]
  init: () => Promise<void>
  addEntry: (date: string, description: string, lines: JournalEntryLine[]) => void
  addEntries: (entries: JournalEntry[]) => void
  updateEntry: (id: string, date: string, description: string, lines: JournalEntryLine[]) => void
  deleteEntry: (id: string) => void
  replaceAll: (entries: JournalEntry[]) => void
  clearData: () => void
}

export const useEntryStore = create<EntryStore>((set, get) => ({
  entries: [],

  async init() {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return

    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) { console.error('[entries] init error', error); return }
    set({ entries: (data ?? []).map(fromRow) })
  },

  addEntry(date, description, lines) {
    const now = new Date().toISOString()
    const entry: JournalEntry = { id: generateId(), date, description, lines, createdAt: now, updatedAt: now }
    set({ entries: [entry, ...get().entries] })
    const userId = useAuthStore.getState().user?.id
    if (userId) supabase.from('entries').insert(toRow(entry, userId))
  },

  addEntries(newEntries) {
    const next = [...newEntries, ...get().entries].sort((a, b) => b.date.localeCompare(a.date))
    set({ entries: next })
    const userId = useAuthStore.getState().user?.id
    if (userId) supabase.from('entries').insert(newEntries.map((e) => toRow(e, userId)))
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
    set({ entries })
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    supabase.from('entries').delete().eq('user_id', userId).then(() =>
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
    date: r.date as string,
    description: r.description as string,
    lines: r.lines as JournalEntryLine[],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}
