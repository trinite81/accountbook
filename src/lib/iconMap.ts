import {
  Wallet, Building2, CreditCard, Receipt, Banknote, TrendingUp,
  Percent, UtensilsCrossed, Bus, Home, Smartphone, Heart,
  Music, ShoppingBag, Coffee, Car, Briefcase, Gift, MoreHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  wallet: Wallet,
  building: Building2,
  card: CreditCard,
  receipt: Receipt,
  banknote: Banknote,
  trending: TrendingUp,
  percent: Percent,
  food: UtensilsCrossed,
  bus: Bus,
  home: Home,
  phone: Smartphone,
  heart: Heart,
  music: Music,
  shopping: ShoppingBag,
  coffee: Coffee,
  car: Car,
  briefcase: Briefcase,
  gift: Gift,
  more: MoreHorizontal,
}

export const ICON_OPTIONS = [
  { key: 'wallet', label: '지갑' },
  { key: 'building', label: '은행' },
  { key: 'card', label: '카드' },
  { key: 'receipt', label: '영수증' },
  { key: 'banknote', label: '지폐' },
  { key: 'trending', label: '수익' },
  { key: 'percent', label: '이자' },
  { key: 'food', label: '식비' },
  { key: 'bus', label: '교통' },
  { key: 'home', label: '주거' },
  { key: 'phone', label: '통신' },
  { key: 'heart', label: '의료' },
  { key: 'music', label: '문화' },
  { key: 'shopping', label: '쇼핑' },
  { key: 'coffee', label: '카페' },
  { key: 'car', label: '차량' },
  { key: 'briefcase', label: '업무' },
  { key: 'gift', label: '선물' },
  { key: 'more', label: '기타' },
]

export const COLOR_OPTIONS = [
  { value: '#3b82f6', label: '파란색' },
  { value: '#22c55e', label: '초록색' },
  { value: '#ef4444', label: '빨간색' },
  { value: '#f97316', label: '주황색' },
  { value: '#a855f7', label: '보라색' },
  { value: '#06b6d4', label: '하늘색' },
  { value: '#f59e0b', label: '노란색' },
  { value: '#64748b', label: '회색' },
  { value: '#ec4899', label: '분홍색' },
  { value: '#84cc16', label: '연두색' },
]
