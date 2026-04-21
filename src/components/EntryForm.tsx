import { useState } from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAccountStore } from '@/store/useAccountStore'
import { useEntryStore } from '@/store/useEntryStore'
import { ACCOUNT_TYPE_LABELS } from '@/types'
import { todayISO } from '@/lib/utils'
import type { JournalEntryLine, AccountType } from '@/types'

const ACCOUNT_TYPE_ORDER: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense']

interface EntryFormProps {
  onSuccess?: () => void
}

export function EntryForm({ onSuccess }: EntryFormProps) {
  const accounts = useAccountStore((s) => s.accounts)
  const addEntry = useEntryStore((s) => s.addEntry)

  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<Partial<JournalEntryLine>[]>([
    { accountId: '', debit: 0, credit: 0 },
    { accountId: '', debit: 0, credit: 0 },
  ])

  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0)
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit

  function updateLine(index: number, field: keyof JournalEntryLine, value: string | number) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, { accountId: '', debit: 0, credit: 0 }])
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isBalanced || !description) return
    const validLines = lines.filter((l) => l.accountId && (l.debit! > 0 || l.credit! > 0))
    addEntry(date, description, validLines as JournalEntryLine[])
    setDescription('')
    setDate(todayISO())
    setLines([
      { accountId: '', debit: 0, credit: 0 },
      { accountId: '', debit: 0, credit: 0 },
    ])
    onSuccess?.()
  }

  const groupedAccounts = ACCOUNT_TYPE_ORDER.map((type) => ({
    type,
    label: ACCOUNT_TYPE_LABELS[type],
    accounts: accounts.filter((a) => a.type === type),
  })).filter((g) => g.accounts.length > 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">날짜</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">적요</Label>
          <Input id="description" placeholder="거래 설명" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_100px_100px_36px] gap-2 text-xs font-medium text-muted-foreground px-1">
          <span>계정과목</span>
          <span className="text-center">차변 (Debit)</span>
          <span className="text-center">대변 (Credit)</span>
          <span />
        </div>

        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_100px_100px_36px] gap-2 items-center">
            <Select value={line.accountId ?? ''} onValueChange={(v) => updateLine(i, 'accountId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="계정 선택" />
              </SelectTrigger>
              <SelectContent>
                {groupedAccounts.map((g) => (
                  <SelectGroup key={g.type}>
                    <SelectLabel>{g.label}</SelectLabel>
                    {g.accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={line.debit || ''}
              onChange={(e) => updateLine(i, 'debit', Number(e.target.value))}
              className="text-right"
            />
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={line.credit || ''}
              onChange={(e) => updateLine(i, 'credit', Number(e.target.value))}
              className="text-right"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLine(i)}
              disabled={lines.length <= 2}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addLine} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> 행 추가
        </Button>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <div className="flex gap-4 text-sm">
          <span>
            차변 합계: <strong className="text-blue-600">{totalDebit.toLocaleString('ko-KR')}원</strong>
          </span>
          <span>
            대변 합계: <strong className="text-red-600">{totalCredit.toLocaleString('ko-KR')}원</strong>
          </span>
        </div>
        {!isBalanced && totalDebit + totalCredit > 0 && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> 차변≠대변
          </span>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={!isBalanced || !description}>
        거래 저장
      </Button>
    </form>
  )
}
