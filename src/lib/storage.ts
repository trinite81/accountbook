import type { Account, JournalEntry } from '@/types'

const KEYS = {
  accounts: 'accountbook:accounts',
  entries: 'accountbook:entries',
} as const

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

// Accounts
export function getAccounts(): Account[] {
  return load<Account>(KEYS.accounts)
}

export function saveAccounts(accounts: Account[]): void {
  save(KEYS.accounts, accounts)
}

// Journal Entries
export function getEntries(): JournalEntry[] {
  return load<JournalEntry>(KEYS.entries)
}

export function saveEntries(entries: JournalEntry[]): void {
  save(KEYS.entries, entries)
}
