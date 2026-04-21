import type { Account, JournalEntry } from '@/types'

export interface ExportData {
  version: 1
  exportedAt: string
  accounts: Account[]
  entries: JournalEntry[]
}

export function exportJSON(accounts: Account[], entries: JournalEntry[]): void {
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    entries,
  }
  download(JSON.stringify(data, null, 2), `가계부_${dateTag()}.json`, 'application/json')
}

export function exportCSV(accounts: Account[], entries: JournalEntry[]): void {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]))
  const rows = [['날짜', '설명', '차변계정', '대변계정', '금액']]

  for (const entry of entries) {
    const debitLine = entry.lines.find((l) => l.debit > 0)
    const creditLine = entry.lines.find((l) => l.credit > 0)
    rows.push([
      entry.date,
      entry.description,
      accountMap.get(debitLine?.accountId ?? '') ?? '',
      accountMap.get(creditLine?.accountId ?? '') ?? '',
      String(debitLine?.debit ?? 0),
    ])
  }

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  download('﻿' + csv, `가계부_${dateTag()}.csv`, 'text/csv')
}

export function parseImportJSON(jsonText: string): ExportData | null {
  try {
    const data = JSON.parse(jsonText) as ExportData
    if (data.version !== 1 || !Array.isArray(data.accounts) || !Array.isArray(data.entries)) {
      return null
    }
    return data
  } catch {
    return null
  }
}

function download(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function dateTag(): string {
  return new Date().toISOString().slice(0, 10)
}
