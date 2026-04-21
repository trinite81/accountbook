import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEntryStore } from '@/store/useEntryStore'
import { useAccountStore } from '@/store/useAccountStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ACCOUNT_TYPE_LABELS } from '@/types'
import type { AccountType } from '@/types'

export function EntryList() {
  const entries = useEntryStore((s) => s.entries)
  const deleteEntry = useEntryStore((s) => s.deleteEntry)
  const getById = useAccountStore((s) => s.getById)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        아직 거래 내역이 없습니다. 위 폼에서 첫 거래를 입력하세요.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isOpen = expanded === entry.id
        const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0)

        return (
          <div key={entry.id} className="border rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left"
              onClick={() => setExpanded(isOpen ? null : entry.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm text-muted-foreground shrink-0">{formatDate(entry.date)}</span>
                <span className="font-medium text-sm truncate">{entry.description}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold">{formatCurrency(totalDebit)}</span>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="text-left pb-1 font-medium">계정과목</th>
                      <th className="text-left pb-1 font-medium">유형</th>
                      <th className="text-right pb-1 font-medium">차변</th>
                      <th className="text-right pb-1 font-medium">대변</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entry.lines.map((line, i) => {
                      const account = getById(line.accountId)
                      return (
                        <tr key={i}>
                          <td className="py-1">{account?.name ?? '(삭제된 계정)'}</td>
                          <td className="py-1">
                            {account && (
                              <Badge variant={account.type as AccountType} className="text-xs">
                                {ACCOUNT_TYPE_LABELS[account.type]}
                              </Badge>
                            )}
                          </td>
                          <td className="py-1 text-right text-blue-600">
                            {line.debit > 0 ? formatCurrency(line.debit) : ''}
                          </td>
                          <td className="py-1 text-right text-red-600">
                            {line.credit > 0 ? formatCurrency(line.credit) : ''}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="flex justify-end pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7 text-xs"
                    onClick={() => deleteEntry(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> 삭제
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
