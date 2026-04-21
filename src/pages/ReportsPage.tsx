import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEntryStore } from '@/store/useEntryStore'
import { useAccountStore } from '@/store/useAccountStore'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#f59e0b', '#64748b']

export function ReportsPage() {
  const entries = useEntryStore((s) => s.entries)
  const accounts = useAccountStore((s) => s.accounts)
  const [monthOffset, setMonthOffset] = useState(0)

  const now = new Date()
  const targetYear = now.getFullYear()
  const targetMonth = now.getMonth() - monthOffset
  const displayDate = new Date(targetYear, targetMonth, 1)
  const displayLabel = `${displayDate.getFullYear()}년 ${displayDate.getMonth() + 1}월`

  const monthEntries = useMemo(() => {
    const y = displayDate.getFullYear()
    const m = displayDate.getMonth() + 1
    const prefix = `${y}-${String(m).padStart(2, '0')}`
    return entries.filter((e) => e.date.startsWith(prefix))
  }, [entries, displayDate])

  // 비용 계정별 합산
  const expenseData = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of monthEntries) {
      for (const line of entry.lines) {
        const acc = accounts.find((a) => a.id === line.accountId)
        if (acc?.type === 'expense' && line.debit > 0) {
          map.set(acc.name, (map.get(acc.name) ?? 0) + line.debit)
        }
      }
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [monthEntries, accounts])

  // 수익 계정별 합산
  const revenueData = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of monthEntries) {
      for (const line of entry.lines) {
        const acc = accounts.find((a) => a.id === line.accountId)
        if (acc?.type === 'revenue' && line.credit > 0) {
          map.set(acc.name, (map.get(acc.name) ?? 0) + line.credit)
        }
      }
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [monthEntries, accounts])

  // 월별 수익/지출 (최근 6개월)
  const monthlyData = useMemo(() => {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(targetYear, now.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const prefix = `${y}-${String(m).padStart(2, '0')}`
      const monthEs = entries.filter((e) => e.date.startsWith(prefix))

      let revenue = 0, expense = 0
      for (const entry of monthEs) {
        for (const line of entry.lines) {
          const acc = accounts.find((a) => a.id === line.accountId)
          if (acc?.type === 'revenue') revenue += line.credit
          if (acc?.type === 'expense') expense += line.debit
        }
      }
      result.push({ month: `${m}월`, revenue, expense })
    }
    return result
  }, [entries, accounts, now, targetYear])

  const totalExpense = expenseData.reduce((s, d) => s + d.value, 0)
  const totalRevenue = revenueData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">분석 리포트</h1>
        <div className="flex items-center gap-2 text-sm">
          <button
            className="px-2 py-1 rounded border hover:bg-accent"
            onClick={() => setMonthOffset((p) => p + 1)}
          >
            ←
          </button>
          <span className="w-24 text-center font-medium">{displayLabel}</span>
          <button
            className="px-2 py-1 rounded border hover:bg-accent disabled:opacity-40"
            onClick={() => setMonthOffset((p) => Math.max(0, p - 1))}
            disabled={monthOffset === 0}
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">이번 달 수익</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">이번 달 지출</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totalExpense)}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">월별 수익 / 지출 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} tick={{ fontSize: 11 }} width={45} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="revenue" name="수익" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" name="지출" fill="#f97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {expenseData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">지출 항목별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expenseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {expenseData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1">
              {expenseData.map((d, i) => (
                <li key={d.name} className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />
                    {d.name}
                  </span>
                  <span className="font-medium">{formatCurrency(d.value)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {expenseData.length === 0 && revenueData.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {displayLabel} 거래 내역이 없습니다.
        </div>
      )}
    </div>
  )
}
