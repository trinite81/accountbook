import { useState, useRef, useEffect } from 'react'
import { Bell, X, Check, UserPlus, GitMerge, Unlink, FileSearch, CheckCheck, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AccountIcon } from '@/components/AccountIcon'
import { ACCOUNT_TYPE_LABELS } from '@/types'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useBookStore } from '@/store/useBookStore'
import { useAccountStore } from '@/store/useAccountStore'
import { useEntryStore } from '@/store/useEntryStore'
import type { AppNotification } from '@/types'

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markAllRead } = useNotificationStore()

  // 패널 외부 클릭 시 닫기
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* 벨 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 패널 */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-card shadow-lg flex flex-col max-h-[480px]">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <span className="font-semibold text-sm">알림</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  모두 읽음
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                새 알림이 없습니다
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClose={() => setOpen(false)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 알림 아이템 ──────────────────────────────────────────────────

function NotificationItem({ notification: n, onClose }: { notification: AppNotification; onClose: () => void }) {
  const { markRead } = useNotificationStore()
  const [loading, setLoading] = useState(false)

  async function handleRead() {
    if (!n.read) await markRead(n.id)
  }

  return (
    <div
      className={cn(
        'px-4 py-3 border-b last:border-b-0 transition-colors',
        !n.read && 'bg-blue-50/60 dark:bg-blue-950/20'
      )}
      onClick={handleRead}
    >
      <div className="flex gap-3">
        <NotificationIcon type={n.type} />
        <div className="flex-1 min-w-0">
          <NotificationContent notification={n} setLoading={setLoading} onClose={onClose} />
          <p className="text-[11px] text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
        </div>
        {!n.read && (
          <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-blue-500" />
        )}
      </div>
      {loading && (
        <p className="text-xs text-muted-foreground mt-1 pl-7">처리 중...</p>
      )}
    </div>
  )
}

function NotificationIcon({ type }: { type: AppNotification['type'] }) {
  const cls = 'shrink-0 mt-0.5 h-4 w-4'
  switch (type) {
    case 'invite':          return <UserPlus className={cn(cls, 'text-blue-500')} />
    case 'invite_accepted': return <Check className={cn(cls, 'text-green-500')} />
    case 'account_merge':   return <GitMerge className={cn(cls, 'text-purple-500')} />
    case 'unshare_request': return <Unlink className={cn(cls, 'text-orange-500')} />
    case 'entry_review':    return <FileSearch className={cn(cls, 'text-yellow-600')} />
  }
}

function NotificationContent({
  notification: n,
  setLoading,
  onClose,
}: {
  notification: AppNotification
  setLoading: (v: boolean) => void
  onClose: () => void
}) {
  switch (n.type) {
    case 'invite':
      return <InviteContent notification={n} setLoading={setLoading} onClose={onClose} />
    case 'invite_accepted':
      return (
        <p className="text-sm">
          <span className="font-medium">{n.payload.fromEmail}</span>님이 초대를 수락했어요.
        </p>
      )
    case 'account_merge':
      return <AccountMergeContent notification={n} setLoading={setLoading} />
    case 'unshare_request':
      return <UnshareContent notification={n} setLoading={setLoading} />
    case 'entry_review':
      return (
        <p className="text-sm">
          <span className="font-medium">{n.payload.requesterEmail}</span>님이 거래 내역 검토를 요청했어요
          {n.payload.entryDescription && (
            <span className="text-muted-foreground"> — {n.payload.entryDescription}</span>
          )}
        </p>
      )
  }
}

// ── 초대 수락/거절 ───────────────────────────────────────────────

function InviteContent({
  notification: n,
  setLoading,
  onClose,
}: {
  notification: AppNotification
  setLoading: (v: boolean) => void
  onClose: () => void
}) {
  const [done, setDone] = useState(false)
  const { markRead } = useNotificationStore()
  const { user } = useAuthStore()
  const initBook = useBookStore((s) => s.init)
  const initAccounts = useAccountStore((s) => s.init)
  const initEntries = useEntryStore((s) => s.init)
  const initNotifications = useNotificationStore((s) => s.init)

  async function accept() {
    if (!n.payload.invitationId || !user) return
    setLoading(true)

    // 초대 정보 조회
    const { data: inv } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', n.payload.invitationId)
      .single()

    if (!inv) { setLoading(false); return }

    // 현재 내 book 조회
    const { data: myMembership } = await supabase
      .from('book_members')
      .select('book_id')
      .eq('user_id', user.id)
      .single()

    const myOldBookId = myMembership?.book_id

    // 기존 book에서 나를 제거
    if (myOldBookId) {
      await supabase.from('book_members').delete()
        .eq('book_id', myOldBookId).eq('user_id', user.id)
    }

    // 초대받은 book에 합류
    await supabase.from('book_members').insert({
      book_id: inv.book_id,
      user_id: user.id,
      role: 'member',
    })

    // 내 기존 accounts/entries를 새 book으로 이전
    if (myOldBookId) {
      await supabase.from('accounts').update({ book_id: inv.book_id })
        .eq('book_id', myOldBookId)
      await supabase.from('entries').update({ book_id: inv.book_id })
        .eq('book_id', myOldBookId)

      // 빈 개인 book 삭제
      await supabase.from('books').delete().eq('id', myOldBookId)
    }

    // 초대 상태 업데이트
    await supabase.from('invitations').update({ status: 'accepted' })
      .eq('id', n.payload.invitationId)

    // 초대한 사람에게 수락 알림
    await supabase.from('notifications').insert({
      user_id: inv.from_user_id,
      type: 'invite_accepted',
      payload: { fromEmail: user.email },
    })

    // 공유 book의 전체 accounts 조회 — 병합 필요 항목 계산은 account_merge 알림으로 처리
    const { data: sharedAccounts } = await supabase
      .from('accounts')
      .select('id, name, type, color, icon, user_id')
      .eq('book_id', inv.book_id)

    // 내 계정 vs 상대방 계정 diff (이름 기준)
    const myAccounts = (sharedAccounts ?? []).filter((a) => a.user_id === user.id)
    const otherAccounts = (sharedAccounts ?? []).filter((a) => a.user_id !== user.id)
    const myNames = new Set(myAccounts.map((a: Record<string, unknown>) => a.name))
    const otherNames = new Set(otherAccounts.map((a: Record<string, unknown>) => a.name))

    const myMissing = otherAccounts.filter((a: Record<string, unknown>) => !myNames.has(a.name))
    const theirMissing = myAccounts.filter((a: Record<string, unknown>) => !otherNames.has(a.name))

    // 각자에게 account_merge 알림 (상대방에게 없는 내 계정 목록 포함)
    const mergeJobs = []
    if (myMissing.length > 0) {
      mergeJobs.push(supabase.from('notifications').insert({
        user_id: user.id,
        type: 'account_merge',
        payload: {
          accountsToMerge: myMissing.map((a: Record<string, unknown>) => ({
            id: a.id, name: a.name, type: a.type, color: a.color, icon: a.icon,
          })),
        },
      }))
    }
    if (theirMissing.length > 0) {
      mergeJobs.push(supabase.from('notifications').insert({
        user_id: inv.from_user_id,
        type: 'account_merge',
        payload: {
          accountsToMerge: theirMissing.map((a: Record<string, unknown>) => ({
            id: a.id, name: a.name, type: a.type, color: a.color, icon: a.icon,
          })),
        },
      }))
    }
    await Promise.all(mergeJobs)

    await markRead(n.id)
    setDone(true)
    setLoading(false)

    // store 재초기화
    await initBook()
    await Promise.all([initAccounts(), initEntries(), initNotifications()])
    onClose()
  }

  async function reject() {
    if (!n.payload.invitationId) return
    setLoading(true)
    await supabase.from('invitations').update({ status: 'rejected' })
      .eq('id', n.payload.invitationId)
    await markRead(n.id)
    setDone(true)
    setLoading(false)
  }

  if (done) return <p className="text-sm text-muted-foreground">처리 완료</p>

  return (
    <div>
      <p className="text-sm">
        <span className="font-medium">{n.payload.fromEmail}</span>님이 가계부 공유를 요청했어요.
      </p>
      <div className="flex gap-2 mt-2">
        <button
          onClick={accept}
          className="flex items-center gap-1 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
        >
          <Check className="h-3 w-3" /> 수락
        </button>
        <button
          onClick={reject}
          className="flex items-center gap-1 px-3 py-1 rounded-md border text-xs font-medium hover:bg-accent"
        >
          <X className="h-3 w-3" /> 거절
        </button>
      </div>
    </div>
  )
}

// ── 계정 병합 확인 다이얼로그 ────────────────────────────────────

function AccountMergeContent({
  notification: n,
  setLoading,
}: {
  notification: AppNotification
  setLoading: (v: boolean) => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [done, setDone] = useState(false)
  const { markRead } = useNotificationStore()
  const accounts = n.payload.accountsToMerge ?? []

  if (done) return <p className="text-sm text-muted-foreground">처리 완료</p>
  if (accounts.length === 0) return <p className="text-sm">계정이 이미 동기화되어 있어요.</p>

  return (
    <>
      <div>
        <p className="text-sm font-medium mb-1">상대방에게만 있는 계정 {accounts.length}개</p>
        <ul className="text-xs text-muted-foreground space-y-0.5 mb-2">
          {accounts.slice(0, 3).map((a) => (
            <li key={a.id} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: a.color }} />
              {a.name}
            </li>
          ))}
          {accounts.length > 3 && (
            <li className="text-muted-foreground">외 {accounts.length - 3}개...</li>
          )}
        </ul>
        <div className="flex gap-2">
          <button
            onClick={() => setDialogOpen(true)}
            className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
          >
            계정 선택하기
          </button>
          <button
            onClick={async () => { await markRead(n.id); setDone(true) }}
            className="px-3 py-1 rounded-md border text-xs font-medium hover:bg-accent"
          >
            건너뛰기
          </button>
        </div>
      </div>
      <AccountMergeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        notification={n}
        setLoading={setLoading}
        onDone={() => setDone(true)}
      />
    </>
  )
}

function AccountMergeDialog({
  open, onOpenChange, notification: n, setLoading, onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  notification: AppNotification
  setLoading: (v: boolean) => void
  onDone: () => void
}) {
  const { markRead } = useNotificationStore()
  const { user } = useAuthStore()
  const bookId = useBookStore((s) => s.book?.id)
  const initAccounts = useAccountStore((s) => s.init)
  const accounts = n.payload.accountsToMerge ?? []
  const [selected, setSelected] = useState<Set<string>>(new Set(accounts.map((a) => a.id)))
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSave() {
    if (!user || !bookId) return
    setSaving(true)
    setLoading(true)
    const { generateId } = await import('@/lib/utils')
    const now = new Date().toISOString()
    const toAdd = accounts.filter((a) => selected.has(a.id))
    if (toAdd.length > 0) {
      const rows = toAdd.map((a) => ({
        id: generateId(),
        book_id: bookId,
        user_id: user.id,
        name: a.name,
        type: a.type,
        color: a.color,
        icon: a.icon,
        is_active: true,
        is_default: false,
        start_date: now.slice(0, 10),
        end_date: null,
        description: null,
        created_at: now,
      }))
      await supabase.from('accounts').insert(rows)
    }
    await markRead(n.id)
    await initAccounts()
    setSaving(false)
    setLoading(false)
    onOpenChange(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
        <DialogHeader>
          <DialogTitle>계정 추가 확인</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          추가할 계정을 선택하세요. 선택 해제한 계정은 추가되지 않습니다.
        </p>
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
              onClick={() => toggle(a.id)}
            >
              <input
                type="checkbox"
                checked={selected.has(a.id)}
                onChange={() => toggle(a.id)}
                className="h-4 w-4 accent-primary"
                onClick={(e) => e.stopPropagation()}
              />
              <AccountIcon icon={a.icon} color={a.color} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[a.type]}</p>
              </div>
              <span className="h-3 w-3 rounded-full shrink-0" style={{ background: a.color }} />
            </li>
          ))}
        </ul>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {selected.size}개 추가
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent"
          >
            취소
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── 공유 해제 수락 ───────────────────────────────────────────────

function UnshareContent({
  notification: n,
  setLoading,
}: {
  notification: AppNotification
  setLoading: (v: boolean) => void
}) {
  const [done, setDone] = useState(false)
  const { markRead } = useNotificationStore()
  const { user } = useAuthStore()
  const book = useBookStore((s) => s.book)
  const members = useBookStore((s) => s.members)
  const initBook = useBookStore((s) => s.init)
  const initAccounts = useAccountStore((s) => s.init)
  const initEntries = useEntryStore((s) => s.init)
  const initNotifications = useNotificationStore((s) => s.init)

  async function approve() {
    if (!n.payload.unshareRequestId || !user || !book) return
    setLoading(true)

    // 내 승인 삽입
    await supabase.from('unshare_approvals').insert({
      request_id: n.payload.unshareRequestId,
      user_id: user.id,
    })

    // 전체 멤버 수 vs 승인 수 비교
    const { data: approvals } = await supabase
      .from('unshare_approvals')
      .select('user_id')
      .eq('request_id', n.payload.unshareRequestId)

    const approvalCount = approvals?.length ?? 0
    const memberCount = members.length

    if (approvalCount >= memberCount) {
      // 전원 승인 — 각 멤버에게 새 개인 book 생성 후 분리
      for (const member of members) {
        if (member.userId === user.id) continue

        // 다른 멤버들에게 각각 새 book 생성
        const { data: newBook } = await supabase
          .from('books').insert({ name: '가계부' }).select().single()
        if (!newBook) continue

        // 해당 멤버를 새 book의 owner로
        await supabase.from('book_members').insert({
          book_id: newBook.id, user_id: member.userId, role: 'owner',
        })

        // 해당 멤버의 accounts/entries를 새 book으로
        await supabase.from('accounts').update({ book_id: newBook.id })
          .eq('book_id', book.id).eq('user_id', member.userId)
        await supabase.from('entries').update({ book_id: newBook.id })
          .eq('book_id', book.id).eq('user_id', member.userId)

        // 해당 멤버를 공유 book에서 제거
        await supabase.from('book_members').delete()
          .eq('book_id', book.id).eq('user_id', member.userId)

        // 분리 완료 알림
        await supabase.from('notifications').insert({
          user_id: member.userId,
          type: 'unshare_request',
          payload: { requestedByEmail: user.email, unshareRequestId: n.payload.unshareRequestId },
        })
      }

      // 내 account를 개인 book으로 (현재 shared book이 내 book이 됨 — 그냥 다른 멤버만 제거하면 됨)
      // 이미 내 account/entries는 같은 book_id에 있으므로 ok
    }

    await markRead(n.id)
    setDone(true)
    setLoading(false)

    // store 재초기화
    await initBook()
    await Promise.all([initAccounts(), initEntries(), initNotifications()])
  }

  if (done) return <p className="text-sm text-muted-foreground">승인 완료</p>

  return (
    <div>
      <p className="text-sm">
        <span className="font-medium">{n.payload.requestedByEmail}</span>님이 공유 해제를 요청했어요.
        전원이 수락하면 가계부가 분리됩니다.
      </p>
      <button
        onClick={approve}
        className="mt-2 flex items-center gap-1 px-3 py-1 rounded-md bg-orange-500 text-white text-xs font-medium hover:bg-orange-600"
      >
        <Check className="h-3 w-3" /> 수락
      </button>
    </div>
  )
}

// ── 유틸 ─────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}
