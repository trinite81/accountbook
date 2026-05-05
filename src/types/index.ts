export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export interface Account {
  id: string
  bookId: string
  name: string
  type: AccountType
  description?: string
  color: string
  icon: string
  isActive: boolean
  isDefault: boolean
  startDate: string    // YYYY-MM-DD
  endDate?: string     // YYYY-MM-DD, undefined = 무제한
  createdAt: string
}

export interface JournalEntryLine {
  accountId: string
  debit: number
  credit: number
}

export interface JournalEntry {
  id: string
  bookId: string
  userId: string       // 작성자 (수정/삭제 권한 확인용)
  date: string
  description: string
  lines: JournalEntryLine[]
  createdAt: string
  updatedAt: string
}

// ── 공유 가계부 ──────────────────────────────────────────────────

export interface Book {
  id: string
  name: string
  createdAt: string
}

export type BookMemberRole = 'owner' | 'member'

export interface BookMember {
  bookId: string
  userId: string
  role: BookMemberRole
  joinedAt: string
  email?: string       // 화면 표시용 (join 조회 시)
}

export type InvitationStatus = 'pending' | 'accepted' | 'rejected'

export interface Invitation {
  id: string
  bookId: string
  fromUserId: string
  toEmail: string
  status: InvitationStatus
  createdAt: string
}

// ── 알림 ─────────────────────────────────────────────────────────

export type NotificationType =
  | 'invite'           // 초대 받음
  | 'invite_accepted'  // 내 초대를 상대방이 수락
  | 'account_merge'    // 계정 병합 확인 요청
  | 'unshare_request'  // 공유 해제 요청
  | 'entry_review'     // 거래 내역 검토 요청

export interface NotificationPayload {
  // invite
  invitationId?: string
  fromEmail?: string
  bookName?: string
  // account_merge
  accountsToMerge?: Array<{ id: string; name: string; type: AccountType; color: string; icon: string }>
  // unshare_request
  unshareRequestId?: string
  requestedByEmail?: string
  // entry_review
  entryId?: string
  entryDescription?: string
  entryDate?: string
  requesterEmail?: string
}

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  payload: NotificationPayload
  read: boolean
  createdAt: string
}

export interface UnshareRequest {
  id: string
  bookId: string
  requestedBy: string
  createdAt: string
}

// ── 상수 ─────────────────────────────────────────────────────────

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: '자산',
  liability: '부채',
  equity: '자본',
  revenue: '수익',
  expense: '비용',
}

export const ACCOUNT_TYPE_BADGE_CLASSES: Record<AccountType, string> = {
  asset: 'bg-blue-100 text-blue-700',
  liability: 'bg-red-100 text-red-700',
  equity: 'bg-purple-100 text-purple-700',
  revenue: 'bg-green-100 text-green-700',
  expense: 'bg-orange-100 text-orange-700',
}
