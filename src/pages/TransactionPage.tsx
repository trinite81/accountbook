import { useState, useMemo } from 'react'
import { Pencil, Trash2, TrendingUp, TrendingDown, Wallet, Plus, X, ArrowRight, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EntryForm, type EntryFormValues } from '@/components/EntryForm'
import { AccountIcon } from '@/components/AccountIcon'
import { useEntryStore } from '@/store/useEntryStore'
import { useAccountStore } from '@/store/useAccountStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useBookStore } from '@/store/useBookStore'
import { supabase } from '@/lib/supabase'
import { formatCurrency, todayISO } from '@/lib/utils'
import { ViewFilterTabs } from '@/components/ViewFilterTabs'
import { type ViewFilter, getUserColor } from '@/lib/viewFilter'
import type { JournalEntry } from '@/types'

type DateFilter = 'today' | 'week' | 'month' | 'all'

const FILTER_LABELS: Record<DateFilter, string> = {
  today: '오늘',
  week: '이번주',
  month: '이번달',
  all: '전체',
}

function getFilterRange(filter: DateFilter): { start: string; end: string } {
  const today = todayISO()
  if (filter === 'today') return { start: today, end: today }
  if (filter === 'week') {
    const d = new Date()
    const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    return { start: d.toISOString().slice(0, 10), end: today }
  }
  if (filter === 'month') return { start: today.slice(0, 7) + '-01', end: today }
  return { start: '0000-01-01', end: '9999-12-31' }
}

export function TransactionPage() {
  const entries = useEntryStore((s) => s.entries)
  const addEntry = useEntryStore((s) => s.addEntry)
  const updateEntry = useEntryStore((s) => s.updateEntry)
  const deleteEntry = useEntryStore((s) => s.deleteEntry)
  const getById = useAccountStore((s) => s.getById)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const currentUserEmail = useAuthStore((s) => s.user?.email)
  const members = useBookStore((s) => s.members)
  const isSharing = members.length > 1

  const [filter, setFilter] = useState<DateFilter>('month')
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [reviewSent, setReviewSent] = useState<Set<string>>(new Set())

  const viewEntries = useMemo(
    () => viewFilter === 'mine' && currentUserId
      ? entries.filter((e) => e.userId === currentUserId)
      : entries,
    [entries, viewFilter, currentUserId]
  )

  async function handleReviewRequest(entry: JournalEntry) {
    if (!currentUserId || !currentUserEmail) return
    await supabase.from('notifications').insert({
      user_id: entry.userId,
      type: 'entry_review',
      payload: {
        entryId: entry.id,
        entryDescription: entry.description,
        entryDate: entry.date,
        requesterEmail: currentUserEmail,
      },
    })
    setReviewSent((prev) => new Set(prev).add(entry.id))
  }

  const { start, end } = getFilterRange(filter)
  const filteredEntries = useMemo(
    () => viewEntries.filter((e) => e.date >= start && e.date <= end),
    [viewEntries, start, end]
  )

  const today = todayISO()
  const { todayIncome, todayExpense } = useMemo(() => {
    let income = 0, expense = 0
    for (const entry of viewEntries) {
      if (entry.date !== today) continue
      for (const line of entry.lines) {
        const acc = getById(line.accountId)
        if (acc?.type === 'revenue') income += line.credit
        if (acc?.type === 'expense') expense += line.debit
      }
    }
    return { todayIncome: income, todayExpense: expense }
  }, [viewEntries, today, getById])

  const netWorth = useMemo(() => {
    let balance = 0
    for (const entry of viewEntries) {
      for (const line of entry.lines) {
        const acc = getById(line.accountId)
        if (!acc) continue
        if (acc.type === 'asset') balance += line.debit - line.credit
        if (acc.type === 'liability') balance -= line.credit - line.debit
      }
    }
    return balance
  }, [viewEntries, getById])

  function handleAdd(values: EntryFormValues) {
    addEntry(values.date, values.description, [
      { accountId: values.debitAccountId, debit: values.amount, credit: 0 },
      { accountId: values.creditAccountId, debit: 0, credit: values.amount },
    ])
    setShowAddForm(false)
  }

  function handleEdit(values: EntryFormValues) {
    if (!editingEntry) return
    updateEntry(editingEntry.id, values.date, values.description, [
      { accountId: values.debitAccountId, debit: values.amount, credit: 0 },
      { accountId: values.creditAccountId, debit: 0, credit: values.amount },
    ])
    setEditingEntry(null)
  }

  function getEditInitialValues(entry: JournalEntry): Partial<EntryFormValues> {
    const debitLine = entry.lines.find((l) => l.debit > 0)
    const creditLine = entry.lines.find((l) => l.credit > 0)
    return {
      date: entry.date,
      description: entry.description,
      amount: debitLine?.debit ?? 0,
      debitAccountId: debitLine?.accountId ?? '',
      creditAccountId: creditLine?.accountId ?? '',
    }
  }

  function getEntryType(entry: JournalEntry): 'income' | 'expense' | 'transfer' {
    const debitAcc = getById(entry.lines.find((l) => l.debit > 0)?.accountId ?? '')
    const creditAcc = getById(entry.lines.find((l) => l.credit > 0)?.accountId ?? '')
    if (creditAcc?.type === 'revenue') return 'income'
    if (debitAcc?.type === 'expense') return 'expense'
    return 'transfer'
  }

  return (
    <div className="space-y-4">

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryCard
          label="오늘 수입"
          value={todayIncome}
          icon={<TrendingUp className="h-4 w-4" />}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
        />
        <SummaryCard
          label="오늘 지출"
          value={todayExpense}
          icon={<TrendingDown className="h-4 w-4" />}
          colorClass="text-red-500"
          bgClass="bg-red-50"
        />
        <SummaryCard
          label="잔액"
          value={netWorth}
          icon={<Wallet className="h-4 w-4" />}
          colorClass={netWorth >= 0 ? 'text-green-600' : 'text-destructive'}
          bgClass={netWorth >= 0 ? 'bg-green-50' : 'bg-red-50'}
        />
      </div>

      {/* 거래 추가 폼 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">거래 입력</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm((v) => !v)} className="h-7 gap-1">
              {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span className="hidden sm:inline">{showAddForm ? '닫기' : '새 거래'}</span>
            </Button>
          </div>
        </CardHeader>
        {showAddForm && (
          <CardContent className="pt-0">
            <EntryForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} submitLabel="거래 추가" />
          </CardContent>
        )}
      </Card>

      {/* 거래 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">
              거래 내역
              <span className="ml-2 text-sm font-normal text-muted-foreground">{filteredEntries.length}건</span>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {isSharing && (
                <ViewFilterTabs value={viewFilter} onChange={setViewFilter} />
              )}
              <div className="flex gap-1 flex-wrap">
                {(Object.keys(FILTER_LABELS) as DateFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      filter === f
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredEntries.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">
              {FILTER_LABELS[filter]} 거래 내역이 없습니다.
            </p>
          ) : (
            <>
              {/* ── 모바일 카드 뷰 (sm 미만) ── */}
              <div className="sm:hidden divide-y">
                {filteredEntries.map((entry) => {
                  const debitLine = entry.lines.find((l) => l.debit > 0)
                  const creditLine = entry.lines.find((l) => l.credit > 0)
                  const debitAcc = getById(debitLine?.accountId ?? '')
                  const creditAcc = getById(creditLine?.accountId ?? '')
                  const type = getEntryType(entry)

                  return (
                    <div
                      key={entry.id}
                      className="px-4 py-3 hover:bg-muted/30 transition-colors"
                      style={viewFilter === 'compare' && isSharing
                        ? { borderLeft: `3px solid ${getUserColor(entry.userId, members)}` }
                        : undefined}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm leading-tight truncate">{entry.description}</p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {debitAcc && (
                              <span className="flex items-center gap-1">
                                <AccountIcon icon={debitAcc.icon} color={debitAcc.color} size="sm" />
                                <span className="text-xs text-muted-foreground">{debitAcc.name}</span>
                              </span>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            {creditAcc && (
                              <span className="flex items-center gap-1">
                                <AccountIcon icon={creditAcc.icon} color={creditAcc.color} size="sm" />
                                <span className="text-xs text-muted-foreground">{creditAcc.name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-bold text-sm ${
                            type === 'income' ? 'text-blue-600' : type === 'expense' ? 'text-red-500' : 'text-foreground'
                          }`}>
                            {type === 'income' ? '+' : type === 'expense' ? '-' : ''}
                            {formatCurrency(debitLine?.debit ?? 0)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {entry.date.slice(5).replace('-', '/')}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-1 mt-1.5">
                        {isSharing && entry.userId !== currentUserId && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-yellow-600"
                            title="검토 요청"
                            disabled={reviewSent.has(entry.id)}
                            onClick={() => handleReviewRequest(entry)}
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        )}
                        {entry.userId === currentUserId && (
                          <>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingEntry(entry)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteEntry(entry.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── 데스크톱/태블릿 테이블 뷰 (sm 이상) ── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left py-2.5 px-4 font-medium text-muted-foreground whitespace-nowrap">날짜</th>
                      <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">설명</th>
                      <th className="text-left py-2.5 px-4 font-medium text-muted-foreground hidden md:table-cell">차변</th>
                      <th className="text-left py-2.5 px-4 font-medium text-muted-foreground hidden md:table-cell">대변</th>
                      <th className="text-right py-2.5 px-4 font-medium text-muted-foreground whitespace-nowrap">금액</th>
                      <th className="py-2.5 px-4 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredEntries.map((entry) => {
                      const debitLine = entry.lines.find((l) => l.debit > 0)
                      const creditLine = entry.lines.find((l) => l.credit > 0)
                      const debitAcc = getById(debitLine?.accountId ?? '')
                      const creditAcc = getById(creditLine?.accountId ?? '')
                      const type = getEntryType(entry)

                      return (
                        <tr
                          key={entry.id}
                          className="hover:bg-muted/30 transition-colors"
                          style={viewFilter === 'compare' && isSharing
                            ? { borderLeft: `3px solid ${getUserColor(entry.userId, members)}` }
                            : undefined}
                        >
                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap text-xs">
                            {entry.date.slice(5).replace('-', '/')}
                          </td>
                          <td className="py-3 px-4 font-medium max-w-[200px] truncate">
                            {entry.description}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            {debitAcc && (
                              <span className="flex items-center gap-1.5">
                                <AccountIcon icon={debitAcc.icon} color={debitAcc.color} size="sm" />
                                <span className="text-xs">{debitAcc.name}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            {creditAcc && (
                              <span className="flex items-center gap-1.5">
                                <AccountIcon icon={creditAcc.icon} color={creditAcc.color} size="sm" />
                                <span className="text-xs">{creditAcc.name}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                            <span className={
                              type === 'income' ? 'text-blue-600'
                                : type === 'expense' ? 'text-red-500'
                                : 'text-foreground'
                            }>
                              {type === 'income' ? '+' : type === 'expense' ? '-' : ''}
                              {formatCurrency(debitLine?.debit ?? 0)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              {isSharing && entry.userId !== currentUserId && (
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-yellow-600"
                                  title="검토 요청"
                                  disabled={reviewSent.has(entry.id)}
                                  onClick={() => handleReviewRequest(entry)}
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {entry.userId === currentUserId && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => setEditingEntry(entry)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteEntry(entry.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>거래 수정</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <EntryForm
              initialValues={getEditInitialValues(editingEntry)}
              onSubmit={handleEdit}
              onCancel={() => setEditingEntry(null)}
              submitLabel="수정 저장"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({
  label, value, icon, colorClass, bgClass,
}: {
  label: string
  value: number
  icon: React.ReactNode
  colorClass: string
  bgClass: string
}) {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        <div className={`rounded-md p-1 ${bgClass} ${colorClass} hidden sm:block`}>{icon}</div>
      </div>
      <p className={`text-sm sm:text-lg font-bold leading-tight ${colorClass}`}>
        {formatCurrency(value)}
      </p>
    </div>
  )
}
