import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AccountIcon } from '@/components/AccountIcon'
import { useAccountStore } from '@/store/useAccountStore'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_BADGE_CLASSES } from '@/types'
import { todayISO } from '@/lib/utils'
import type { AccountType } from '@/types'

const ACCOUNT_TYPE_ORDER: AccountType[] = ['asset', 'liability', 'revenue', 'expense']

export interface EntryFormValues {
  date: string
  description: string
  amount: number
  debitAccountId: string
  creditAccountId: string
}

interface EntryFormProps {
  initialValues?: Partial<EntryFormValues>
  onSubmit: (values: EntryFormValues) => void
  onCancel?: () => void
  submitLabel?: string
}

function isEligibleForDate(a: { isActive: boolean; startDate: string; endDate?: string }, date: string) {
  if (!a.isActive) return false
  if (date < a.startDate) return false
  if (a.endDate && date > a.endDate) return false
  return true
}

export function EntryForm({ initialValues, onSubmit, onCancel, submitLabel = '저장' }: EntryFormProps) {
  const accounts = useAccountStore((s) => s.accounts)

  const [date, setDate] = useState(initialValues?.date ?? todayISO())
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [amount, setAmount] = useState(initialValues?.amount ? String(initialValues.amount) : '')
  const [debitId, setDebitId] = useState(initialValues?.debitAccountId ?? '')
  const [creditId, setCreditId] = useState(initialValues?.creditAccountId ?? '')

  function handleDateChange(newDate: string) {
    setDate(newDate)
    if (debitId) {
      const acc = accounts.find((a) => a.id === debitId)
      if (acc && !isEligibleForDate(acc, newDate)) setDebitId('')
    }
    if (creditId) {
      const acc = accounts.find((a) => a.id === creditId)
      if (acc && !isEligibleForDate(acc, newDate)) setCreditId('')
    }
  }

  const isValid = description.trim() && Number(amount) > 0 && debitId && creditId && debitId !== creditId

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    onSubmit({ date, description: description.trim(), amount: Number(amount), debitAccountId: debitId, creditAccountId: creditId })
  }

  const eligibleAccounts = accounts.filter((a) => isEligibleForDate(a, date))
  const groupedAccounts = ACCOUNT_TYPE_ORDER.map((type) => ({
    type,
    label: ACCOUNT_TYPE_LABELS[type],
    accounts: eligibleAccounts.filter((a) => a.type === type),
  })).filter((g) => g.accounts.length > 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="ef-date">날짜</Label>
          <Input id="ef-date" type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} required />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ef-desc">거래 설명</Label>
          <Input id="ef-desc" placeholder="예: 급여 수령" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ef-amount">금액 (원)</Label>
          <Input
            id="ef-amount"
            type="number"
            min={1}
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-right"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>
            차변 계정 <span className="text-xs text-blue-500 font-normal">(Debit — 증가하는 계정)</span>
          </Label>
          <AccountSelect
            value={debitId}
            onChange={setDebitId}
            grouped={groupedAccounts}
            placeholder="차변 계정 선택"
          />
        </div>
        <div className="space-y-1.5">
          <Label>
            대변 계정 <span className="text-xs text-red-500 font-normal">(Credit — 감소하는 계정)</span>
          </Label>
          <AccountSelect
            value={creditId}
            onChange={setCreditId}
            grouped={groupedAccounts}
            placeholder="대변 계정 선택"
          />
        </div>
      </div>

      {debitId && creditId && debitId === creditId && (
        <p className="text-xs text-destructive">차변과 대변 계정이 같을 수 없습니다.</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={!isValid}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </form>
  )
}

function AccountSelect({
  value, onChange, grouped, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  grouped: { type: AccountType; label: string; accounts: ReturnType<typeof useAccountStore.getState>['accounts'] }[]
  placeholder: string
}) {
  const allAccounts = grouped.flatMap((g) => g.accounts)
  const selected = allAccounts.find((a) => a.id === value)

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        {selected ? (
          <span className="flex items-center gap-2">
            <AccountIcon icon={selected.icon} color={selected.color} size="sm" />
            <span>{selected.name}</span>
            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${ACCOUNT_TYPE_BADGE_CLASSES[selected.type]}`}>
              {ACCOUNT_TYPE_LABELS[selected.type]}
            </span>
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {grouped.map((g) => (
          <SelectGroup key={g.type}>
            <SelectLabel>{g.label}</SelectLabel>
            {g.accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span className="flex items-center gap-2">
                  <AccountIcon icon={a.icon} color={a.color} size="sm" />
                  {a.name}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
