import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountIcon } from '@/components/AccountIcon'
import { useEntryStore } from '@/store/useEntryStore'
import { useAccountStore } from '@/store/useAccountStore'
import { formatCurrency } from '@/lib/utils'
import { ACCOUNT_TYPE_BADGE_CLASSES, ACCOUNT_TYPE_LABELS } from '@/types'
import type { AccountType } from '@/types'

type PeriodType = 'day' | 'week' | 'month' | 'year'

const PIE_COLORS = ['#f97316', '#ef4444', '#a855f7', '#06b6d4', '#f59e0b', '#64748b', '#ec4899', '#84cc16', '#3b82f6']

function formatAmount(v: number) {
  if (Math.abs(v) >= 10_000_000) return `${(v / 10_000_000).toFixed(1)}천만`
  if (Math.abs(v) >= 10_000) return `${(v / 10_000).toFixed(0)}만`
  return `${v}`
}

export function ReportsPage() {
  const entries = useEntryStore((s) => s.entries)
  const accounts = useAccountStore((s) => s.accounts)

  const [period, setPeriod] = useState<PeriodType>('month')
  const [offset, setOffset] = useState(0)

  // --- 기간 범위 계산 ---
  const { start, end, label, prevStart, prevEnd } = useMemo(
    () => computeRange(period, offset),
    [period, offset]
  )

  // 현재 기간 거래
  const periodEntries = useMemo(
    () => entries.filter((e) => e.date >= start && e.date <= end),
    [entries, start, end]
  )

  // 이전 기간 거래
  const prevEntries = useMemo(
    () => entries.filter((e) => e.date >= prevStart && e.date <= prevEnd),
    [entries, prevStart, prevEnd]
  )

  const { income, expense } = useMemo(() => sumIncomeExpense(periodEntries, accounts), [periodEntries, accounts])
  const { income: prevIncome, expense: prevExpense } = useMemo(() => sumIncomeExpense(prevEntries, accounts), [prevEntries, accounts])

  const net = income - expense
  const prevNet = prevIncome - prevExpense

  // --- 비용 파이 차트 ---
  const expensePieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string; icon: string }>()
    for (const entry of periodEntries) {
      for (const line of entry.lines) {
        const acc = accounts.find((a) => a.id === line.accountId)
        if (acc?.type === 'expense' && line.debit > 0) {
          const prev = map.get(acc.id)
          map.set(acc.id, prev
            ? { ...prev, value: prev.value + line.debit }
            : { name: acc.name, value: line.debit, color: acc.color, icon: acc.icon }
          )
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [periodEntries, accounts])

  // --- 기간별 비교 막대 그래프 ---
  const barData = useMemo(() => buildBarData(period, offset, entries, accounts), [period, offset, entries, accounts])

  // --- 잔액 추이 라인 차트 ---
  const balanceTrend = useMemo(() => buildBalanceTrend(entries, accounts), [entries, accounts])

  // --- 계정별 상세 ---
  const accountDetails = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>()
    for (const entry of periodEntries) {
      for (const line of entry.lines) {
        const prev = map.get(line.accountId) ?? { debit: 0, credit: 0 }
        map.set(line.accountId, { debit: prev.debit + line.debit, credit: prev.credit + line.credit })
      }
    }
    return accounts
      .filter((a) => map.has(a.id))
      .map((a) => ({ account: a, ...map.get(a.id)! }))
      .sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit))
  }, [periodEntries, accounts])

  return (
    <div className="space-y-5">
      {/* 기간 탭 + 네비게이션 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs value={period} onValueChange={(v) => { setPeriod(v as PeriodType); setOffset(0) }}>
          <TabsList>
            <TabsTrigger value="day">일별</TabsTrigger>
            <TabsTrigger value="week">주별</TabsTrigger>
            <TabsTrigger value="month">월별</TabsTrigger>
            <TabsTrigger value="year">연별</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 text-sm">
          <button className="p-1 rounded border hover:bg-accent" onClick={() => setOffset((p) => p + 1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-32 text-center font-medium text-sm">{label}</span>
          <button
            className="p-1 rounded border hover:bg-accent disabled:opacity-40"
            onClick={() => setOffset((p) => Math.max(0, p - 1))}
            disabled={offset === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="총 수입" value={income} color="text-blue-600" prev={prevIncome} />
        <MetricCard label="총 지출" value={expense} color="text-red-500" prev={prevExpense} />
        <MetricCard label="순이익" value={net} color={net >= 0 ? 'text-green-600' : 'text-destructive'} prev={prevNet} />
      </div>

      {/* 수입 vs 지출 막대 그래프 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">수입 vs 지출 비교</CardTitle>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">데이터가 없습니다.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11 }} width={45} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="수입" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="지출" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 비용 파이 + 잔액 추이 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">지출 항목별 비중</CardTitle>
          </CardHeader>
          <CardContent>
            {expensePieData.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">지출 내역 없음</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={30}
                    >
                      {expensePieData.map((d, i) => (
                        <Cell key={i} fill={d.color ?? PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="space-y-1 mt-1">
                  {expensePieData.slice(0, 6).map((d, i) => (
                    <li key={i} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                        {d.name}
                      </span>
                      <span className="font-medium">{formatCurrency(d.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">잔액 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {balanceTrend.length < 2 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">누적 거래가 부족합니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={balanceTrend} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11 }} width={45} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => String(l)} />
                  <Line type="monotone" dataKey="balance" name="잔액" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 계정별 상세 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">계정별 상세 내역</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {accountDetails.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">데이터가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">계정</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground hidden sm:table-cell">유형</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">차변 합계</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">대변 합계</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">잔액</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {accountDetails.map(({ account, debit, credit }) => {
                    const balance = account.type === 'liability' ? credit - debit : debit - credit
                    return (
                      <tr key={account.id} className="hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-2">
                            <AccountIcon icon={account.icon} color={account.color} size="sm" />
                            <span className="font-medium text-sm">{account.name}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${ACCOUNT_TYPE_BADGE_CLASSES[account.type as AccountType]}`}>
                            {ACCOUNT_TYPE_LABELS[account.type as AccountType]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-blue-600 text-xs font-medium">
                          {debit > 0 ? formatCurrency(debit) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-red-500 text-xs font-medium">
                          {credit > 0 ? formatCurrency(credit) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-xs">
                          <span className={balance >= 0 ? 'text-green-600' : 'text-destructive'}>
                            {formatCurrency(balance)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---- helpers ----

function sumIncomeExpense(
  periodEntries: ReturnType<typeof useEntryStore.getState>['entries'],
  accounts: ReturnType<typeof useAccountStore.getState>['accounts']
) {
  let income = 0, expense = 0
  for (const entry of periodEntries) {
    for (const line of entry.lines) {
      const acc = accounts.find((a) => a.id === line.accountId)
      if (acc?.type === 'revenue') income += line.credit
      if (acc?.type === 'expense') expense += line.debit
    }
  }
  return { income, expense }
}

function computeRange(period: PeriodType, offset: number) {
  const now = new Date()

  if (period === 'day') {
    const d = new Date(now)
    d.setDate(d.getDate() - offset)
    const s = d.toISOString().slice(0, 10)
    const prev = new Date(d)
    prev.setDate(prev.getDate() - 1)
    const ps = prev.toISOString().slice(0, 10)
    return { start: s, end: s, label: s.replace(/-/g, '/'), prevStart: ps, prevEnd: ps }
  }

  if (period === 'week') {
    const d = new Date(now)
    const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1 - offset * 7)
    const mon = d.toISOString().slice(0, 10)
    const sun = new Date(d)
    sun.setDate(d.getDate() + 6)
    const sunStr = sun.toISOString().slice(0, 10)
    const pMon = new Date(d)
    pMon.setDate(d.getDate() - 7)
    const pSun = new Date(pMon)
    pSun.setDate(pMon.getDate() + 6)
    return {
      start: mon, end: sunStr,
      label: `${mon.slice(5).replace('-', '/')} ~ ${sunStr.slice(5).replace('-', '/')}`,
      prevStart: pMon.toISOString().slice(0, 10), prevEnd: pSun.toISOString().slice(0, 10),
    }
  }

  if (period === 'month') {
    const y = now.getFullYear()
    const m = now.getMonth() - offset
    const d = new Date(y, m, 1)
    const lastDay = new Date(y, m + 1, 0)
    const s = d.toISOString().slice(0, 10)
    const e = lastDay.toISOString().slice(0, 10)
    const pd = new Date(y, m - 1, 1)
    const plast = new Date(y, m, 0)
    return {
      start: s, end: e,
      label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
      prevStart: pd.toISOString().slice(0, 10), prevEnd: plast.toISOString().slice(0, 10),
    }
  }

  // year
  const y = now.getFullYear() - offset
  return {
    start: `${y}-01-01`, end: `${y}-12-31`,
    label: `${y}년`,
    prevStart: `${y - 1}-01-01`, prevEnd: `${y - 1}-12-31`,
  }
}

function buildBarData(
  period: PeriodType,
  offset: number,
  entries: ReturnType<typeof useEntryStore.getState>['entries'],
  accounts: ReturnType<typeof useAccountStore.getState>['accounts']
) {
  const count = period === 'day' ? 14 : period === 'week' ? 8 : period === 'month' ? 6 : 5

  return Array.from({ length: count }, (_, i) => {
    const o = offset + (count - 1 - i)
    const { start, end, label } = computeRange(period, o)
    const sub = entries.filter((e) => e.date >= start && e.date <= end)
    const { income, expense } = sumIncomeExpense(sub, accounts)
    return { label: label.replace(/년|월/g, '').trim(), income, expense }
  })
}

function buildBalanceTrend(
  entries: ReturnType<typeof useEntryStore.getState>['entries'],
  accounts: ReturnType<typeof useAccountStore.getState>['accounts']
) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  let balance = 0
  const result: { date: string; balance: number }[] = []
  const dateMap = new Map<string, number>()

  for (const entry of sorted) {
    for (const line of entry.lines) {
      const acc = accounts.find((a) => a.id === line.accountId)
      if (!acc) continue
      if (acc.type === 'asset') balance += line.debit - line.credit
      if (acc.type === 'liability') balance -= line.credit - line.debit
    }
    dateMap.set(entry.date, balance)
  }

  for (const [date, bal] of dateMap.entries()) {
    result.push({ date, balance: bal })
  }

  return result
}

function MetricCard({ label, value, color, prev }: { label: string; value: number; color: string; prev: number }) {
  const delta = prev !== 0 ? ((value - prev) / Math.abs(prev)) * 100 : null
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-base sm:text-lg font-bold leading-tight ${color}`}>{formatCurrency(value)}</p>
      {delta !== null && (
        <p className={`text-xs mt-0.5 ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% 전기 대비
        </p>
      )}
    </div>
  )
}
