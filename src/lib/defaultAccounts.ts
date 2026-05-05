import type { Account } from '@/types'
import { generateId } from './utils'

const now = new Date().toISOString()
const today = now.slice(0, 10)

// bookId는 init 시점에 book으로부터 주입됨
export const DEFAULT_ACCOUNTS: Omit<Account, 'bookId'>[] = [
  // 자산 — 파란색 계열
  { id: generateId(), name: '현금',       type: 'asset',     color: '#3b82f6', icon: 'wallet',   isActive: true, isDefault: true, startDate: today, createdAt: now },
  { id: generateId(), name: '은행계좌',   type: 'asset',     color: '#1d4ed8', icon: 'building', isActive: true, isDefault: true, startDate: today, createdAt: now },
  { id: generateId(), name: '신용카드',   type: 'asset',     color: '#60a5fa', icon: 'card',     isActive: true, isDefault: true, startDate: today, createdAt: now },
  // 부채 — 빨간색 계열
  { id: generateId(), name: '신용카드미결제', type: 'liability', color: '#ef4444', icon: 'receipt',  isActive: true, isDefault: true, startDate: today, createdAt: now },
  { id: generateId(), name: '대출',           type: 'liability', color: '#b91c1c', icon: 'banknote', isActive: true, isDefault: true, startDate: today, createdAt: now },
  // 수익 — 초록색 계열
  { id: generateId(), name: '급여',     type: 'revenue', color: '#16a34a', icon: 'briefcase', isActive: true, isDefault: true, startDate: today, createdAt: now },
  { id: generateId(), name: '부수입',   type: 'revenue', color: '#22c55e', icon: 'trending',  isActive: true, isDefault: true, startDate: today, createdAt: now },
  { id: generateId(), name: '이자수입', type: 'revenue', color: '#15803d', icon: 'percent',   isActive: true, isDefault: true, startDate: today, createdAt: now },
  // 비용 — 주황/앰버 계열
  { id: generateId(), name: '식비',     type: 'expense', color: '#f97316', icon: 'food',     isActive: true, isDefault: true, startDate: today, createdAt: now },
  { id: generateId(), name: '교통비',   type: 'expense', color: '#ea580c', icon: 'bus',      isActive: true, isDefault: true, startDate: today, createdAt: now },
  { id: generateId(), name: '주거비',   type: 'expense', color: '#fb923c', icon: 'home',     isActive: true, isDefault: true, startDate: today, createdAt: now },
  { id: generateId(), name: '통신비',   type: 'expense', color: '#f59e0b', icon: 'phone',    isActive: true, isDefault: true, startDate: today, createdAt: now },
  { id: generateId(), name: '의료비',   type: 'expense', color: '#d97706', icon: 'heart',    isActive: true, isDefault: true, startDate: today, createdAt: now },
  { id: generateId(), name: '문화/여가', type: 'expense', color: '#fbbf24', icon: 'music',   isActive: true, isDefault: true, startDate: today, createdAt: now },
  { id: generateId(), name: '기타비용', type: 'expense', color: '#b45309', icon: 'more',     isActive: true, isDefault: true, startDate: today, createdAt: now },
]
