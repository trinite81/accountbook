import { create } from 'zustand'
import type { JournalEntry, JournalEntryLine } from '@/types'
import { getEntries, saveEntries } from '@/lib/storage'
import { generateId } from '@/lib/utils'

interface EntryStore {
  entries: JournalEntry[]
  init: () => void
  addEntry: (date: string, description: string, lines: JournalEntryLine[]) => void
  updateEntry: (id: string, date: string, description: string, lines: JournalEntryLine[]) => void
  deleteEntry: (id: string) => void
}

export const useEntryStore = create<EntryStore>((set, get) => ({
  entries: [],

  init() {
    set({ entries: getEntries() })
  },

  addEntry(date, description, lines) {
    const now = new Date().toISOString()
    const entry: JournalEntry = {
      id: generateId(),
      date,
      description,
      lines,
      createdAt: now,
      updatedAt: now,
    }
    const next = [entry, ...get().entries]
    saveEntries(next)
    set({ entries: next })
  },

  updateEntry(id, date, description, lines) {
    const next = get().entries.map((e) =>
      e.id === id ? { ...e, date, description, lines, updatedAt: new Date().toISOString() } : e
    )
    saveEntries(next)
    set({ entries: next })
  },

  deleteEntry(id) {
    const next = get().entries.filter((e) => e.id !== id)
    saveEntries(next)
    set({ entries: next })
  },
}))
