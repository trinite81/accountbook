import type { Account } from '@/types'
import { generateId } from './utils'

const now = new Date().toISOString()

export const DEFAULT_ACCOUNTS: Account[] = [
  // 자산
  { id: generateId(), name: '현금', type: 'asset', color: '#22c55e', icon: 'wallet', isActive: true, isDefault: true, createdAt: now },
  { id: generateId(), name: '은행계좌', type: 'asset', color: '#3b82f6', icon: 'building', isActive: true, isDefault: true, createdAt: now },
  { id: generateId(), name: '신용카드', type: 'asset', color: '#06b6d4', icon: 'card', isActive: true, isDefault: true, createdAt: now },
  // 부채
  { id: generateId(), name: '신용카드미결제', type: 'liability', color: '#ef4444', icon: 'receipt', isActive: true, isDefault: true, createdAt: now },
  { id: generateId(), name: '대출', type: 'liability', color: '#f97316', icon: 'banknote', isActive: true, isDefault: true, createdAt: now },
  // 수익
  { id: generateId(), name: '급여', type: 'revenue', color: '#3b82f6', icon: 'briefcase', isActive: true, isDefault: true, createdAt: now },
  { id: generateId(), name: '부수입', type: 'revenue', color: '#22c55e', icon: 'trending', isActive: true, isDefault: true, createdAt: now },
  { id: generateId(), name: '이자수입', type: 'revenue', color: '#84cc16', icon: 'percent', isActive: true, isDefault: true, createdAt: now },
  // 비용
  { id: generateId(), name: '식비', type: 'expense', color: '#f97316', icon: 'food', isActive: true, isDefault: true, createdAt: now },
  { id: generateId(), name: '교통비', type: 'expense', color: '#64748b', icon: 'bus', isActive: true, isDefault: true, createdAt: now },
  { id: generateId(), name: '주거비', type: 'expense', color: '#a855f7', icon: 'home', isActive: true, isDefault: true, createdAt: now },
  { id: generateId(), name: '통신비', type: 'expense', color: '#06b6d4', icon: 'phone', isActive: true, isDefault: true, createdAt: now },
  { id: generateId(), name: '의료비', type: 'expense', color: '#ec4899', icon: 'heart', isActive: true, isDefault: true, createdAt: now },
  { id: generateId(), name: '문화/여가', type: 'expense', color: '#f59e0b', icon: 'music', isActive: true, isDefault: true, createdAt: now },
  { id: generateId(), name: '기타비용', type: 'expense', color: '#64748b', icon: 'more', isActive: true, isDefault: true, createdAt: now },
]
