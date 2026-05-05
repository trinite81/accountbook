import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell as BarCell,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, ReferenceLine, ComposedChart, Customized,
} from 'recharts'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountIcon } from '@/components/AccountIcon'
import { useEntryStore } from '@/store/useEntryStore'
import { useAccountStore } from '@/store/useAccountStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useBookStore } from '@/store/useBookStore'
import { ViewFilterTabs } from '@/components/ViewFilterTabs'
import { type ViewFilter, getUserColor, USER_COLORS } from '@/lib/viewFilter'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ACCOUNT_TYPE_BADGE_CLASSES, ACCOUNT_TYPE_LABELS } from '@/types'
import type { AccountType } from '@/types'

type PeriodType = 'day' | 'week' | 'month' | 'year'

interface DrillDownRow {
  date: string
  description: string
  debitAccount: string
  creditAccount: string
  debitColor: string
  creditColor: string
  debitIcon: string
  creditIcon: string
  amount: number
  type: 'income' | 'expense' | 'other'
}

interface DrillDown {
  title: string
  rows: DrillDownRow[]
  source: 'bar' | 'pie' | 'income-pie'
}

const PIE_COLORS = ['#f97316', '#ef4444', '#a855f7', '#06b6d4', '#f59e0b', '#64748b', '#ec4899', '#84cc16', '#3b82f6']

function formatAmount(v: number) {
  if (Math.abs(v) >= 10_000_000) return `${(v / 10_000_000).toFixed(1)}천만`
  if (Math.abs(v) >= 10_000) return `${(v / 10_000).toFixed(0)}만`
  return `${v}`
}

export function ReportsPage() {
  const entries = useEntryStore((s) => s.entries)
  const accounts = useAccountStore((s) => s.accounts)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const members = useBookStore((s) => s.members)
  const isSharing = members.length > 1

  const [period, setPeriod] = useState<PeriodType>('month')
  const [offset, setOffset] = useState(0)
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all')
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null)
  const [selectedBarKey, setSelectedBarKey] = useState<string | null>(null)
  const [selectedPieName, setSelectedPieName] = useState<string | null>(null)
  const [selectedIncomePieName, setSelectedIncomePieName] = useState<string | null>(null)
  const [selectedStackAccount, setSelectedStackAccount] = useState<string | null>(null)

  const { start, end, label, prevStart, prevEnd } = useMemo(
    () => computeRange(period, offset),
    [period, offset]
  )

  const viewEntries = useMemo(
    () => viewFilter === 'mine' && currentUserId
      ? entries.filter((e) => e.userId === currentUserId)
      : entries,
    [entries, viewFilter, currentUserId]
  )

  const periodEntries = useMemo(
    () => viewEntries.filter((e) => e.date >= start && e.date <= end),
    [viewEntries, start, end]
  )

  const prevEntries = useMemo(
    () => viewEntries.filter((e) => e.date >= prevStart && e.date <= prevEnd),
    [viewEntries, prevStart, prevEnd]
  )

  const { income, expense } = useMemo(() => sumIncomeExpense(periodEntries, accounts), [periodEntries, accounts])
  const { income: prevIncome, expense: prevExpense } = useMemo(() => sumIncomeExpense(prevEntries, accounts), [prevEntries, accounts])
  const net = income - expense
  const prevNet = prevIncome - prevExpense

  const expensePieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string; icon: string; accountId: string }>()
    for (const entry of periodEntries) {
      for (const line of entry.lines) {
        const acc = accounts.find((a) => a.id === line.accountId)
        if (acc?.type === 'expense' && line.debit > 0) {
          const prev = map.get(acc.id)
          map.set(acc.id, prev
            ? { ...prev, value: prev.value + line.debit }
            : { name: acc.name, value: line.debit, color: acc.color, icon: acc.icon, accountId: acc.id }
          )
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [periodEntries, accounts])

  const incomePieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string; icon: string; accountId: string }>()
    for (const entry of periodEntries) {
      for (const line of entry.lines) {
        const acc = accounts.find((a) => a.id === line.accountId)
        if (acc?.type === 'revenue' && line.credit > 0) {
          const prev = map.get(acc.id)
          map.set(acc.id, prev
            ? { ...prev, value: prev.value + line.credit }
            : { name: acc.name, value: line.credit, color: acc.color, icon: acc.icon, accountId: acc.id }
          )
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [periodEntries, accounts])

  const top5Expenses = useMemo(() => {
    const rows: { date: string; description: string; account: string; accountColor: string; accountIcon: string; from: string; amount: number; userId: string }[] = []
    for (const entry of periodEntries) {
      const debitLine = entry.lines.find((l) => l.debit > 0)
      const creditLine = entry.lines.find((l) => l.credit > 0)
      const debitAcc = accounts.find((a) => a.id === debitLine?.accountId)
      if (debitAcc?.type !== 'expense') continue
      const creditAcc = accounts.find((a) => a.id === creditLine?.accountId)
      rows.push({
        date: entry.date,
        description: entry.description,
        account: debitAcc.name,
        accountColor: debitAcc.color,
        accountIcon: debitAcc.icon,
        from: creditAcc?.name ?? '(알 수 없음)',
        amount: debitLine?.debit ?? 0,
        userId: entry.userId,
      })
    }
    return rows.sort((a, b) => b.amount - a.amount).slice(0, 5)
  }, [periodEntries, accounts])

  const barData = useMemo(() => buildBarData(period, offset, viewEntries, accounts), [period, offset, viewEntries, accounts])
  const netWorthTrend = useMemo(() => buildNetWorthTrend(viewEntries, accounts), [viewEntries, accounts])
  const savingsRateTrend = useMemo(() => buildSavingsRateTrend(period, offset, viewEntries, accounts), [period, offset, viewEntries, accounts])

  const compareBarData = useMemo(
    () => viewFilter === 'compare' ? buildBarDataCompare(period, offset, entries, accounts, members) : [],
    [viewFilter, period, offset, entries, accounts, members]
  )
  const compareNetWorthTrend = useMemo(
    () => viewFilter === 'compare' ? buildNetWorthTrendCompare(entries, accounts, members) : [],
    [viewFilter, entries, accounts, members]
  )
  const compareSavingsRateTrend = useMemo(
    () => viewFilter === 'compare' ? buildSavingsRateTrendCompare(period, offset, entries, accounts, members) : [],
    [viewFilter, period, offset, entries, accounts, members]
  )
  const { data: stackedExpenseData, activeAccounts: stackedAccounts } = useMemo(
    () => buildStackedExpenseData(period, offset, entries, accounts),
    [period, offset, entries, accounts]
  )

  const sortedStackAccounts = useMemo(() =>
    [...stackedAccounts].sort((a, b) => {
      const totA = stackedExpenseData.reduce((s, r) => s + ((r[a.id] as number) || 0), 0)
      const totB = stackedExpenseData.reduce((s, r) => s + ((r[b.id] as number) || 0), 0)
      return totB - totA
    }),
    [stackedAccounts, stackedExpenseData]
  )

  const accountDetailsByType = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>()
    for (const entry of periodEntries) {
      for (const line of entry.lines) {
        const prev = map.get(line.accountId) ?? { debit: 0, credit: 0 }
        map.set(line.accountId, { debit: prev.debit + line.debit, credit: prev.credit + line.credit })
      }
    }
    const rows = accounts
      .filter((a) => map.has(a.id))
      .map((a) => ({ account: a, ...map.get(a.id)! }))

    const TYPE_ORDER: AccountType[] = ['asset', 'liability', 'revenue', 'expense']
    return TYPE_ORDER
      .map((type) => ({
        type,
        rows: rows
          .filter((r) => r.account.type === type)
          .sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit)),
      }))
      .filter((g) => g.rows.length > 0)
  }, [periodEntries, accounts])

  // --- drill-down handlers ---

  function handleBarClick(data: { start: string; end: string; fullLabel: string; label: string }, type: 'income' | 'expense') {
    const key = `${data.label}-${type}`
    if (selectedBarKey === key) { setSelectedBarKey(null); setDrillDown(null); return }
    setSelectedBarKey(key); setSelectedPieName(null); setSelectedIncomePieName(null)

    const rangeEntries = entries.filter((e) => e.date >= data.start && e.date <= data.end)
    const rows: DrillDownRow[] = []
    for (const entry of rangeEntries) {
      const debitLine = entry.lines.find((l) => l.debit > 0)
      const creditLine = entry.lines.find((l) => l.credit > 0)
      const debitAcc = accounts.find((a) => a.id === debitLine?.accountId)
      const creditAcc = accounts.find((a) => a.id === creditLine?.accountId)
      const isIncome = creditAcc?.type === 'revenue'
      const isExpense = debitAcc?.type === 'expense'
      if (type === 'income' && !isIncome) continue
      if (type === 'expense' && !isExpense) continue
      rows.push({
        date: entry.date, description: entry.description,
        debitAccount: debitAcc?.name ?? '(삭제된 계정)', creditAccount: creditAcc?.name ?? '(삭제된 계정)',
        debitColor: debitAcc?.color ?? '#64748b', creditColor: creditAcc?.color ?? '#64748b',
        debitIcon: debitAcc?.icon ?? 'more', creditIcon: creditAcc?.icon ?? 'more',
        amount: type === 'income' ? (creditLine?.credit ?? 0) : (debitLine?.debit ?? 0), type,
      })
    }
    rows.sort((a, b) => b.date.localeCompare(a.date))
    setDrillDown({ title: `${data.fullLabel} ${type === 'income' ? '수입' : '지출'} 내역 (${rows.length}건)`, rows, source: 'bar' })
  }

  function handlePieClick(data: { name: string; accountId: string }) {
    if (selectedPieName === data.name) { setSelectedPieName(null); setDrillDown(null); return }
    setSelectedPieName(data.name); setSelectedBarKey(null); setSelectedIncomePieName(null)

    const rows: DrillDownRow[] = []
    for (const entry of periodEntries) {
      const debitLine = entry.lines.find((l) => l.accountId === data.accountId && l.debit > 0)
      if (!debitLine) continue
      const creditLine = entry.lines.find((l) => l.credit > 0)
      const creditAcc = accounts.find((a) => a.id === creditLine?.accountId)
      const debitAcc = accounts.find((a) => a.id === debitLine.accountId)
      rows.push({
        date: entry.date, description: entry.description,
        debitAccount: data.name, creditAccount: creditAcc?.name ?? '(삭제된 계정)',
        debitColor: debitAcc?.color ?? '#64748b', creditColor: creditAcc?.color ?? '#64748b',
        debitIcon: debitAcc?.icon ?? 'more', creditIcon: creditAcc?.icon ?? 'more',
        amount: debitLine.debit, type: 'expense',
      })
    }
    rows.sort((a, b) => b.date.localeCompare(a.date))
    setDrillDown({ title: `${data.name} 지출 내역 (${rows.length}건)`, rows, source: 'pie' })
  }

  function handleIncomePieClick(data: { name: string; accountId: string }) {
    if (selectedIncomePieName === data.name) { setSelectedIncomePieName(null); setDrillDown(null); return }
    setSelectedIncomePieName(data.name); setSelectedBarKey(null); setSelectedPieName(null)

    const rows: DrillDownRow[] = []
    for (const entry of periodEntries) {
      const creditLine = entry.lines.find((l) => l.accountId === data.accountId && l.credit > 0)
      if (!creditLine) continue
      const debitLine = entry.lines.find((l) => l.debit > 0)
      const debitAcc = accounts.find((a) => a.id === debitLine?.accountId)
      const creditAcc = accounts.find((a) => a.id === creditLine.accountId)
      rows.push({
        date: entry.date, description: entry.description,
        debitAccount: debitAcc?.name ?? '(삭제된 계정)', creditAccount: data.name,
        debitColor: debitAcc?.color ?? '#64748b', creditColor: creditAcc?.color ?? '#64748b',
        debitIcon: debitAcc?.icon ?? 'more', creditIcon: creditAcc?.icon ?? 'more',
        amount: creditLine.credit, type: 'income',
      })
    }
    rows.sort((a, b) => b.date.localeCompare(a.date))
    setDrillDown({ title: `${data.name} 수입 내역 (${rows.length}건)`, rows, source: 'income-pie' })
  }

  function clearDrillDown() {
    setDrillDown(null); setSelectedBarKey(null); setSelectedPieName(null); setSelectedIncomePieName(null)
  }

  function changePeriod(v: PeriodType) { setPeriod(v); setOffset(0); clearDrillDown(); setSelectedStackAccount(null) }
  function changeOffset(next: number) { setOffset(next); clearDrillDown(); setSelectedStackAccount(null) }

  return (
    <div className="space-y-5">
      {/* 기간 탭 + 네비게이션 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Tabs value={period} onValueChange={(v) => changePeriod(v as PeriodType)}>
            <TabsList>
              <TabsTrigger value="day">일별</TabsTrigger>
              <TabsTrigger value="week">주별</TabsTrigger>
              <TabsTrigger value="month">월별</TabsTrigger>
              <TabsTrigger value="year">연별</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 text-sm">
            <button className="p-1 rounded border hover:bg-accent" onClick={() => changeOffset(offset + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-32 text-center font-medium text-sm">{label}</span>
            <button
              className="p-1 rounded border hover:bg-accent disabled:opacity-40"
              onClick={() => changeOffset(Math.max(0, offset - 1))}
              disabled={offset === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {isSharing && (
          <ViewFilterTabs
            value={viewFilter}
            onChange={(v) => { setViewFilter(v); clearDrillDown() }}
          />
        )}
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">수입 vs 지출 비교</CardTitle>
            <p className="text-xs text-muted-foreground">막대를 클릭하면 상세 내역이 표시됩니다</p>
          </div>
        </CardHeader>
        <CardContent>
          {viewFilter === 'compare' ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={compareBarData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11 }} width={45} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                {members.flatMap((m, i) => {
                  const color = USER_COLORS[i % USER_COLORS.length]
                  const lbl = m.userId === currentUserId ? '나' : `멤버 ${i + 1}`
                  return [
                    <Bar key={`inc_${m.userId}`} dataKey={`income_${m.userId}`} name={`${lbl} 수입`} fill={color} stackId="income" radius={[3, 3, 0, 0]} />,
                    <Bar key={`exp_${m.userId}`} dataKey={`expense_${m.userId}`} name={`${lbl} 지출`} fill={color} fillOpacity={0.4} stackId="expense" />,
                  ]
                })}
              </BarChart>
            </ResponsiveContainer>
          ) : barData.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">데이터가 없습니다.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11 }} width={45} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="수입" radius={[3, 3, 0, 0]} cursor="pointer" onClick={(data) => handleBarClick(data, 'income')}>
                  {barData.map((d) => (
                    <BarCell key={d.label} fill="#3b82f6" opacity={selectedBarKey && selectedBarKey !== `${d.label}-income` ? 0.35 : 1} />
                  ))}
                </Bar>
                <Bar dataKey="expense" name="지출" radius={[3, 3, 0, 0]} cursor="pointer" onClick={(data) => handleBarClick(data, 'expense')}>
                  {barData.map((d) => (
                    <BarCell key={d.label} fill="#ef4444" opacity={selectedBarKey && selectedBarKey !== `${d.label}-expense` ? 0.35 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
        {drillDown?.source === 'bar' && <DrillDownPanel drillDown={drillDown} onClose={clearDrillDown} />}
      </Card>

      {/* 지출 파이 + 수입 파이 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">지출 항목별 비중</CardTitle>
              <p className="text-xs text-muted-foreground">클릭하면 상세 내역 표시</p>
            </div>
          </CardHeader>
          <CardContent>
            {expensePieData.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">지출 내역 없음</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={expensePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30} cursor="pointer" onClick={handlePieClick}>
                      {expensePieData.map((d, i) => (
                        <Cell key={i} fill={d.color ?? PIE_COLORS[i % PIE_COLORS.length]}
                          opacity={selectedPieName && selectedPieName !== d.name ? 0.35 : 1}
                          stroke={selectedPieName === d.name ? '#1e293b' : 'none'}
                          strokeWidth={selectedPieName === d.name ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="space-y-1 mt-1">
                  {expensePieData.slice(0, 6).map((d, i) => (
                    <li key={i}
                      className={`flex items-center justify-between text-xs rounded px-1 py-0.5 cursor-pointer transition-colors ${selectedPieName === d.name ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}`}
                      onClick={() => handlePieClick(d)}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                        {d.name}
                      </span>
                      <span>{formatCurrency(d.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
          {drillDown?.source === 'pie' && <DrillDownPanel drillDown={drillDown} onClose={clearDrillDown} />}
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">수입 항목별 비중</CardTitle>
              <p className="text-xs text-muted-foreground">클릭하면 상세 내역 표시</p>
            </div>
          </CardHeader>
          <CardContent>
            {incomePieData.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">수입 내역 없음</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={incomePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30} cursor="pointer" onClick={handleIncomePieClick}>
                      {incomePieData.map((d, i) => (
                        <Cell key={i} fill={d.color ?? PIE_COLORS[i % PIE_COLORS.length]}
                          opacity={selectedIncomePieName && selectedIncomePieName !== d.name ? 0.35 : 1}
                          stroke={selectedIncomePieName === d.name ? '#1e293b' : 'none'}
                          strokeWidth={selectedIncomePieName === d.name ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="space-y-1 mt-1">
                  {incomePieData.slice(0, 6).map((d, i) => (
                    <li key={i}
                      className={`flex items-center justify-between text-xs rounded px-1 py-0.5 cursor-pointer transition-colors ${selectedIncomePieName === d.name ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}`}
                      onClick={() => handleIncomePieClick(d)}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                        {d.name}
                      </span>
                      <span>{formatCurrency(d.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
          {drillDown?.source === 'income-pie' && <DrillDownPanel drillDown={drillDown} onClose={clearDrillDown} />}
        </Card>
      </div>

      {/* 순자산 추이 + 저축률 추이 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">순자산 추이 <span className="text-xs font-normal text-muted-foreground">(자산 − 부채)</span></CardTitle>
          </CardHeader>
          <CardContent>
            {viewFilter === 'compare' ? (
              compareNetWorthTrend.length < 2 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">누적 거래가 부족합니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={compareNetWorthTrend} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11 }} width={45} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => String(l)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                    {members.map((m, i) => (
                      <Line
                        key={m.userId}
                        type="monotone"
                        dataKey={`netWorth_${m.userId}`}
                        name={m.userId === currentUserId ? '나' : `멤버 ${i + 1}`}
                        stroke={USER_COLORS[i % USER_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )
            ) : netWorthTrend.length < 2 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">누적 거래가 부족합니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={netWorthTrend} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11 }} width={45} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => String(l)} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="netWorth" name="순자산" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">저축률 추이 <span className="text-xs font-normal text-muted-foreground">((수입−지출)÷수입)</span></CardTitle>
          </CardHeader>
          <CardContent>
            {viewFilter === 'compare' ? (
              compareSavingsRateTrend.every((d) => members.every((m) => d[`rate_${m.userId}`] === null)) ? (
                <p className="text-center py-8 text-sm text-muted-foreground">수입 데이터가 없습니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={compareSavingsRateTrend} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={45} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                    <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="4 4" />
                    {members.map((m, i) => (
                      <Line
                        key={m.userId}
                        type="monotone"
                        dataKey={`rate_${m.userId}`}
                        name={m.userId === currentUserId ? '나' : `멤버 ${i + 1}`}
                        stroke={USER_COLORS[i % USER_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )
            ) : savingsRateTrend.every((d) => d.rate === null) ? (
              <p className="text-center py-8 text-sm text-muted-foreground">수입 데이터가 없습니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={savingsRateTrend} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={45} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, '저축률']} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                  <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="rate" name="저축률" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 지출 카테고리 누적 스택바 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">지출 카테고리 추이</CardTitle>
            <div className="flex items-center gap-2">
              {selectedStackAccount && (
                <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border bg-muted">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: sortedStackAccounts.find((a) => a.id === selectedStackAccount)?.color }}
                  />
                  {sortedStackAccounts.find((a) => a.id === selectedStackAccount)?.name}
                  <button onClick={() => setSelectedStackAccount(null)} className="ml-0.5 text-muted-foreground hover:text-foreground">×</button>
                </span>
              )}
              <p className="text-xs text-muted-foreground">막대 클릭 시 추이 선 표시</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedStackAccounts.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">지출 데이터가 없습니다.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={stackedExpenseData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11 }} width={45} />
                <Tooltip content={<StackedTooltip accounts={sortedStackAccounts} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                {sortedStackAccounts.map((acc) => (
                  <Bar
                    key={acc.id}
                    dataKey={acc.id}
                    name={acc.name}
                    fill={acc.color}
                    stackId="expense"
                    fillOpacity={selectedStackAccount && selectedStackAccount !== acc.id ? 0.2 : 1}
                    cursor="pointer"
                    onClick={() => setSelectedStackAccount((prev) => prev === acc.id ? null : acc.id)}
                  />
                ))}
                {selectedStackAccount && (
                  <Customized
                    component={(chartProps: any) => (
                      <StackBridgeLayer
                        formattedGraphicalItems={chartProps.formattedGraphicalItems}
                        xAxisMap={chartProps.xAxisMap}
                        yAxisMap={chartProps.yAxisMap}
                        data={stackedExpenseData}
                        sortedAccounts={sortedStackAccounts}
                        selectedAccountId={selectedStackAccount}
                        color={sortedStackAccounts.find((a) => a.id === selectedStackAccount)?.color ?? '#888'}
                      />
                    )}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* TOP 5 지출 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">이 기간 최대 지출 TOP 5</CardTitle>
        </CardHeader>
        <CardContent>
          {top5Expenses.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">지출 내역이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {top5Expenses.map((row, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                  <AccountIcon icon={row.accountIcon} color={row.accountColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{row.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(row.date)} · {row.account} ← {row.from}</p>
                  </div>
                  {viewFilter === 'compare' && isSharing && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: getUserColor(row.userId, members) }}
                      title={row.userId === currentUserId ? '나' : '멤버'}
                    />
                  )}
                  <span className="text-sm font-bold text-red-500 whitespace-nowrap shrink-0">{formatCurrency(row.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 계정별 상세 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">계정별 상세 내역</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {accountDetailsByType.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">데이터가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">계정</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">차변 합계</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">대변 합계</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">잔액</th>
                  </tr>
                </thead>
                <tbody>
                  {accountDetailsByType.map(({ type, rows }) => {
                    const groupTotal = rows.reduce(
                      (s, r) => s + (type === 'liability' ? r.credit - r.debit : r.debit - r.credit), 0
                    )
                    return (
                      <>
                        <tr key={`group-${type}`} className="bg-muted/60 border-y">
                          <td colSpan={3} className="py-2 px-4">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACCOUNT_TYPE_BADGE_CLASSES[type]}`}>
                              {ACCOUNT_TYPE_LABELS[type]}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right text-xs font-semibold">
                            <span className={groupTotal >= 0 ? 'text-green-600' : 'text-destructive'}>{formatCurrency(groupTotal)}</span>
                          </td>
                        </tr>
                        {rows.map(({ account, debit, credit }) => {
                          const balance = account.type === 'liability' ? credit - debit : debit - credit
                          return (
                            <tr key={account.id} className="border-b last:border-b-0 hover:bg-muted/20">
                              <td className="py-2.5 px-4 pl-6">
                                <span className="flex items-center gap-2">
                                  <AccountIcon icon={account.icon} color={account.color} size="sm" />
                                  <span className="font-medium text-sm">{account.name}</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right text-blue-600 text-xs font-medium">{debit > 0 ? formatCurrency(debit) : '-'}</td>
                              <td className="py-2.5 px-4 text-right text-red-500 text-xs font-medium">{credit > 0 ? formatCurrency(credit) : '-'}</td>
                              <td className="py-2.5 px-4 text-right font-semibold text-xs">
                                <span className={balance >= 0 ? 'text-green-600' : 'text-destructive'}>{formatCurrency(balance)}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </>
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

// ---- StackedTooltip ----

import type { Account } from '@/types'

function StackedTooltip({ active, payload, label, accounts }: {
  active?: boolean
  payload?: { dataKey: string; name: string; value: number; color: string }[]
  label?: string
  accounts: Account[]
}) {
  if (!active || !payload?.length) return null
  const items = payload.filter((p) => p.value > 0).slice().reverse()
  const total = items.reduce((s, p) => s + p.value, 0)
  if (items.length === 0) return null
  return (
    <div className="bg-background border rounded-lg shadow-md p-2 text-xs min-w-[140px]">
      <p className="font-semibold mb-1.5">{label}</p>
      {items.map((item, i) => {
        const acc = accounts.find((a) => a.id === item.dataKey)
        return (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: acc?.color ?? item.color }} />
              {item.name}
            </span>
            <span className="font-medium">{formatCurrency(item.value)}</span>
          </div>
        )
      })}
      {items.length > 1 && (
        <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t font-semibold">
          <span>합계</span>
          <span>{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  )
}

// ---- StackBridgeLayer ----

function StackBridgeLayer({ formattedGraphicalItems, xAxisMap, yAxisMap, data, sortedAccounts, selectedAccountId, color }: {
  formattedGraphicalItems?: any[]
  xAxisMap?: Record<string, any>
  yAxisMap?: Record<string, any>
  data: Record<string, number | string>[]
  sortedAccounts: { id: string }[]
  selectedAccountId: string
  color: string
}) {
  if (!yAxisMap || data.length < 2) return null

  const yAxis = Object.values(yAxisMap)[0] as any
  const yScale = yAxis?.scale as ((v: number) => number) | undefined
  if (!yScale) return null

  const idx = sortedAccounts.findIndex((a) => a.id === selectedAccountId)
  if (idx === -1) return null

  // Prefer exact bar x/width from recharts internals; fall back to scale estimate
  type BarPos = { x: number; width: number }
  let barPositions: BarPos[] | null = null

  if (formattedGraphicalItems?.length) {
    for (const item of formattedGraphicalItems) {
      // recharts wraps items as { item: ReactElement, props: {data:[...]} }
      // but the exact shape varies — check both paths
      const d: any[] | undefined = item.props?.data ?? item.item?.props?.data
      if (Array.isArray(d) && d.length === data.length && d[0]?.width != null) {
        barPositions = d.map((pt: any) => ({ x: pt.x ?? 0, width: pt.width ?? 0 }))
        break
      }
    }
  }

  if (!barPositions && xAxisMap) {
    const xAxis = Object.values(xAxisMap)[0] as any
    const xScale = xAxis?.scale
    const bw: number = xScale?.bandwidth?.() ?? 0
    if (bw > 0) {
      const sidePad = bw * 0.05
      const barW = bw * 0.90
      barPositions = data.map((row) => ({
        x: (xScale(row.label as string) ?? 0) + sidePad,
        width: barW,
      }))
    }
  }

  if (!barPositions) return null

  const polygons: string[] = []
  for (let i = 0; i < data.length - 1; i++) {
    const L = data[i]
    const R = data[i + 1]
    const lVal = (L[selectedAccountId] as number) || 0
    const rVal = (R[selectedAccountId] as number) || 0
    if (lVal === 0 || rVal === 0) continue

    const lBelow = sortedAccounts.slice(0, idx).reduce((s, a) => s + ((L[a.id] as number) || 0), 0)
    const rBelow = sortedAccounts.slice(0, idx).reduce((s, a) => s + ((R[a.id] as number) || 0), 0)

    const x1 = barPositions[i].x + barPositions[i].width  // exact right edge of left bar
    const x2 = barPositions[i + 1].x                       // exact left edge of right bar
    const y1t = yScale(lBelow + lVal)
    const y1b = yScale(lBelow)
    const y2t = yScale(rBelow + rVal)
    const y2b = yScale(rBelow)

    polygons.push(`${x1},${y1t} ${x2},${y2t} ${x2},${y2b} ${x1},${y1b}`)
  }

  return (
    <g>
      {polygons.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill={color}
          fillOpacity={0.2}
          stroke={color}
          strokeOpacity={0.7}
          strokeWidth={1}
        />
      ))}
    </g>
  )
}

// ---- DrillDownPanel ----

function DrillDownPanel({ drillDown, onClose }: { drillDown: DrillDown; onClose: () => void }) {
  return (
    <div className="border-t bg-muted/30">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">{drillDown.title}</span>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-accent text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      {drillDown.rows.length === 0 ? (
        <p className="text-center pb-4 text-sm text-muted-foreground">해당 기간 내역이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-2 px-4 font-medium text-muted-foreground whitespace-nowrap">날짜</th>
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">설명</th>
                <th className="text-left py-2 px-4 font-medium text-muted-foreground hidden sm:table-cell">차변</th>
                <th className="text-left py-2 px-4 font-medium text-muted-foreground hidden sm:table-cell">대변</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {drillDown.rows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/40">
                  <td className="py-2 px-4 text-muted-foreground whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="py-2 px-4 font-medium">{row.description}</td>
                  <td className="py-2 px-4 hidden sm:table-cell">
                    <span className="flex items-center gap-1">
                      <AccountIcon icon={row.debitIcon} color={row.debitColor} size="sm" />
                      {row.debitAccount}
                    </span>
                  </td>
                  <td className="py-2 px-4 hidden sm:table-cell">
                    <span className="flex items-center gap-1">
                      <AccountIcon icon={row.creditIcon} color={row.creditColor} size="sm" />
                      {row.creditAccount}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right font-semibold whitespace-nowrap">
                    <span className={row.type === 'income' ? 'text-blue-600' : 'text-red-500'}>
                      {row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/20">
                <td colSpan={4} className="py-2 px-4 text-xs text-muted-foreground font-medium text-right hidden sm:table-cell">합계</td>
                <td colSpan={3} className="py-2 px-4 text-xs text-muted-foreground font-medium text-right sm:hidden">합계</td>
                <td className="py-2 px-4 text-right font-bold text-sm">
                  <span className={drillDown.rows[0]?.type === 'income' ? 'text-blue-600' : 'text-red-500'}>
                    {formatCurrency(drillDown.rows.reduce((s, r) => s + r.amount, 0))}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
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
    const d = new Date(now); d.setDate(d.getDate() - offset)
    const s = d.toISOString().slice(0, 10)
    const prev = new Date(d); prev.setDate(prev.getDate() - 1)
    const ps = prev.toISOString().slice(0, 10)
    return { start: s, end: s, label: s.replace(/-/g, '/'), prevStart: ps, prevEnd: ps }
  }

  if (period === 'week') {
    const d = new Date(now); const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1 - offset * 7)
    const mon = d.toISOString().slice(0, 10)
    const sun = new Date(d); sun.setDate(d.getDate() + 6)
    const sunStr = sun.toISOString().slice(0, 10)
    const pMon = new Date(d); pMon.setDate(d.getDate() - 7)
    const pSun = new Date(pMon); pSun.setDate(pMon.getDate() + 6)
    return {
      start: mon, end: sunStr,
      label: `${mon.slice(5).replace('-', '/')} ~ ${sunStr.slice(5).replace('-', '/')}`,
      prevStart: pMon.toISOString().slice(0, 10), prevEnd: pSun.toISOString().slice(0, 10),
    }
  }

  if (period === 'month') {
    const y = now.getFullYear(); const m = now.getMonth() - offset
    const d = new Date(y, m, 1); const lastDay = new Date(y, m + 1, 0)
    const pd = new Date(y, m - 1, 1); const plast = new Date(y, m, 0)
    return {
      start: d.toISOString().slice(0, 10), end: lastDay.toISOString().slice(0, 10),
      label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
      prevStart: pd.toISOString().slice(0, 10), prevEnd: plast.toISOString().slice(0, 10),
    }
  }

  const y = now.getFullYear() - offset
  return {
    start: `${y}-01-01`, end: `${y}-12-31`, label: `${y}년`,
    prevStart: `${y - 1}-01-01`, prevEnd: `${y - 1}-12-31`,
  }
}

function buildBarData(
  period: PeriodType, offset: number,
  entries: ReturnType<typeof useEntryStore.getState>['entries'],
  accounts: ReturnType<typeof useAccountStore.getState>['accounts']
) {
  const count = period === 'day' ? 14 : period === 'week' ? 8 : period === 'month' ? 6 : 5
  return Array.from({ length: count }, (_, i) => {
    const o = offset + (count - 1 - i)
    const { start, end, label } = computeRange(period, o)
    const sub = entries.filter((e) => e.date >= start && e.date <= end)
    const { income, expense } = sumIncomeExpense(sub, accounts)
    return { label: label.replace(/년|월/g, '').trim(), fullLabel: label, income, expense, start, end }
  })
}

function buildNetWorthTrend(
  entries: ReturnType<typeof useEntryStore.getState>['entries'],
  accounts: ReturnType<typeof useAccountStore.getState>['accounts']
) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  let assets = 0, liabilities = 0
  const dateMap = new Map<string, number>()
  for (const entry of sorted) {
    for (const line of entry.lines) {
      const acc = accounts.find((a) => a.id === line.accountId)
      if (!acc) continue
      if (acc.type === 'asset') assets += line.debit - line.credit
      if (acc.type === 'liability') liabilities += line.credit - line.debit
    }
    dateMap.set(entry.date, assets - liabilities)
  }
  return Array.from(dateMap.entries()).map(([date, netWorth]) => ({ date, netWorth }))
}

function buildSavingsRateTrend(
  period: PeriodType, offset: number,
  entries: ReturnType<typeof useEntryStore.getState>['entries'],
  accounts: ReturnType<typeof useAccountStore.getState>['accounts']
) {
  const count = period === 'day' ? 14 : period === 'week' ? 8 : period === 'month' ? 12 : 5
  return Array.from({ length: count }, (_, i) => {
    const o = offset + (count - 1 - i)
    const { start, end, label } = computeRange(period, o)
    const sub = entries.filter((e) => e.date >= start && e.date <= end)
    const { income, expense } = sumIncomeExpense(sub, accounts)
    const rate = income > 0 ? Math.round(((income - expense) / income) * 1000) / 10 : null
    return { label: label.replace(/년|월/g, '').trim(), rate }
  })
}

function buildStackedExpenseData(
  period: PeriodType, offset: number,
  entries: ReturnType<typeof useEntryStore.getState>['entries'],
  accounts: ReturnType<typeof useAccountStore.getState>['accounts']
) {
  const count = period === 'day' ? 14 : period === 'week' ? 8 : period === 'month' ? 6 : 5
  const expenseAccounts = accounts.filter((a) => a.type === 'expense')

  const data = Array.from({ length: count }, (_, i) => {
    const o = offset + (count - 1 - i)
    const { start, end, label } = computeRange(period, o)
    const sub = entries.filter((e) => e.date >= start && e.date <= end)
    const row: Record<string, number | string> = { label: label.replace(/년|월/g, '').trim() }
    for (const acc of expenseAccounts) {
      let total = 0
      for (const entry of sub)
        for (const line of entry.lines)
          if (line.accountId === acc.id && line.debit > 0) total += line.debit
      row[acc.id] = total
    }
    return row
  })

  const activeAccounts = expenseAccounts.filter((acc) => data.some((row) => (row[acc.id] as number) > 0))
  return { data, activeAccounts }
}

function buildBarDataCompare(
  period: PeriodType, offset: number,
  entries: ReturnType<typeof useEntryStore.getState>['entries'],
  accounts: ReturnType<typeof useAccountStore.getState>['accounts'],
  members: { userId: string }[]
) {
  const count = period === 'day' ? 14 : period === 'week' ? 8 : period === 'month' ? 6 : 5
  return Array.from({ length: count }, (_, i) => {
    const o = offset + (count - 1 - i)
    const { start, end, label } = computeRange(period, o)
    const sub = entries.filter((e) => e.date >= start && e.date <= end)
    const row: Record<string, number | string> = { label: label.replace(/년|월/g, '').trim(), fullLabel: label, start, end }
    for (const m of members) {
      const userEntries = sub.filter((e) => e.userId === m.userId)
      const { income, expense } = sumIncomeExpense(userEntries, accounts)
      row[`income_${m.userId}`] = income
      row[`expense_${m.userId}`] = expense
    }
    return row
  })
}

function buildNetWorthTrendCompare(
  entries: ReturnType<typeof useEntryStore.getState>['entries'],
  accounts: ReturnType<typeof useAccountStore.getState>['accounts'],
  members: { userId: string }[]
) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const userTotals = new Map<string, { assets: number; liabilities: number }>()
  for (const m of members) userTotals.set(m.userId, { assets: 0, liabilities: 0 })

  const dateMap = new Map<string, Record<string, number>>()
  for (const entry of sorted) {
    const totals = userTotals.get(entry.userId)
    if (!totals) continue
    for (const line of entry.lines) {
      const acc = accounts.find((a) => a.id === line.accountId)
      if (!acc) continue
      if (acc.type === 'asset') totals.assets += line.debit - line.credit
      if (acc.type === 'liability') totals.liabilities += line.credit - line.debit
    }
    userTotals.set(entry.userId, { ...totals })
    const dateRow: Record<string, number> = {}
    for (const [uid, t] of userTotals) {
      dateRow[`netWorth_${uid}`] = t.assets - t.liabilities
    }
    dateMap.set(entry.date, { ...dateRow })
  }
  return Array.from(dateMap.entries()).map(([date, vals]) => ({ date, ...vals }))
}

function buildSavingsRateTrendCompare(
  period: PeriodType, offset: number,
  entries: ReturnType<typeof useEntryStore.getState>['entries'],
  accounts: ReturnType<typeof useAccountStore.getState>['accounts'],
  members: { userId: string }[]
) {
  const count = period === 'day' ? 14 : period === 'week' ? 8 : period === 'month' ? 12 : 5
  return Array.from({ length: count }, (_, i) => {
    const o = offset + (count - 1 - i)
    const { start, end, label } = computeRange(period, o)
    const sub = entries.filter((e) => e.date >= start && e.date <= end)
    const row: Record<string, number | string | null> = { label: label.replace(/년|월/g, '').trim() }
    for (const m of members) {
      const userEntries = sub.filter((e) => e.userId === m.userId)
      const { income, expense } = sumIncomeExpense(userEntries, accounts)
      row[`rate_${m.userId}`] = income > 0 ? Math.round(((income - expense) / income) * 1000) / 10 : null
    }
    return row
  })
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
