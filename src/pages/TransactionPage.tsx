import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EntryForm } from '@/components/EntryForm'
import { EntryList } from '@/components/EntryList'
import { useEntryStore } from '@/store/useEntryStore'
import { useAccountStore } from '@/store/useAccountStore'
import { formatCurrency } from '@/lib/utils'

export function TransactionPage() {
  const entries = useEntryStore((s) => s.entries)
  const accounts = useAccountStore((s) => s.accounts)

  // 순자산 = 자산 합계 - 부채 합계
  const balances = new Map<string, number>()
  for (const entry of entries) {
    for (const line of entry.lines) {
      const prev = balances.get(line.accountId) ?? 0
      balances.set(line.accountId, prev + line.debit - line.credit)
    }
  }

  const totalAssets = accounts
    .filter((a) => a.type === 'asset')
    .reduce((s, a) => s + (balances.get(a.id) ?? 0), 0)
  const totalLiabilities = accounts
    .filter((a) => a.type === 'liability')
    .reduce((s, a) => s + (balances.get(a.id) ?? 0), 0)
  const netWorth = totalAssets - totalLiabilities

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="총 자산" value={totalAssets} color="text-blue-600" />
        <SummaryCard label="총 부채" value={totalLiabilities} color="text-red-600" />
        <SummaryCard label="순자산" value={netWorth} color={netWorth >= 0 ? 'text-green-600' : 'text-destructive'} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">새 거래 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <EntryForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">거래 내역 ({entries.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          <EntryList />
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{formatCurrency(value)}</p>
    </div>
  )
}
