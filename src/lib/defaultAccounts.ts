import type { Account } from '@/types'
import { generateId } from './utils'

const now = new Date().toISOString()

export const DEFAULT_ACCOUNTS: Account[] = [
  // 자산
  { id: generateId(), name: '현금', type: 'asset', isDefault: true, createdAt: now },
  { id: generateId(), name: '은행계좌', type: 'asset', isDefault: true, createdAt: now },
  { id: generateId(), name: '신용카드', type: 'asset', isDefault: true, createdAt: now },
  // 부채
  { id: generateId(), name: '신용카드미결제', type: 'liability', isDefault: true, createdAt: now },
  { id: generateId(), name: '대출', type: 'liability', isDefault: true, createdAt: now },
  // 수익
  { id: generateId(), name: '급여', type: 'revenue', isDefault: true, createdAt: now },
  { id: generateId(), name: '부수입', type: 'revenue', isDefault: true, createdAt: now },
  { id: generateId(), name: '이자수입', type: 'revenue', isDefault: true, createdAt: now },
  // 비용
  { id: generateId(), name: '식비', type: 'expense', isDefault: true, createdAt: now },
  { id: generateId(), name: '교통비', type: 'expense', isDefault: true, createdAt: now },
  { id: generateId(), name: '주거비', type: 'expense', isDefault: true, createdAt: now },
  { id: generateId(), name: '통신비', type: 'expense', isDefault: true, createdAt: now },
  { id: generateId(), name: '의료비', type: 'expense', isDefault: true, createdAt: now },
  { id: generateId(), name: '문화/여가', type: 'expense', isDefault: true, createdAt: now },
  { id: generateId(), name: '기타비용', type: 'expense', isDefault: true, createdAt: now },
]
