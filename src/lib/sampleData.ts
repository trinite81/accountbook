import type { Account, JournalEntry } from '@/types'
import { generateId } from './utils'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function generateSampleEntries(accounts: Account[]): JournalEntry[] {
  const get = (name: string) => accounts.find((a) => a.name === name)?.id ?? ''

  const cash = get('현금')
  const bank = get('은행계좌')
  const card = get('신용카드')
  const cardDebt = get('신용카드미결제')
  const salary = get('급여')
  const sideIncome = get('부수입')
  const food = get('식비')
  const transport = get('교통비')
  const housing = get('주거비')
  const telecom = get('통신비')
  const health = get('의료비')
  const culture = get('문화/여가')
  const other = get('기타비용')

  const now = new Date().toISOString()
  function entry(date: string, description: string, debitId: string, creditId: string, amount: number): JournalEntry {
    return {
      id: generateId(),
      date,
      description,
      lines: [
        { accountId: debitId, debit: amount, credit: 0 },
        { accountId: creditId, debit: 0, credit: amount },
      ],
      createdAt: now,
      updatedAt: now,
    }
  }

  return [
    // 3달치 급여
    entry(daysAgo(90), '3월 급여 수령', bank, salary, 3_500_000),
    entry(daysAgo(60), '4월 급여 수령', bank, salary, 3_500_000),
    entry(daysAgo(30), '5월 급여 수령', bank, salary, 3_500_000),
    entry(daysAgo(5), '6월 급여 수령', bank, salary, 3_500_000),

    // 부수입
    entry(daysAgo(75), '프리랜서 작업비', cash, sideIncome, 300_000),
    entry(daysAgo(20), '중고물품 판매', cash, sideIncome, 85_000),

    // 주거비 (월세)
    entry(daysAgo(88), '3월 월세', housing, bank, 700_000),
    entry(daysAgo(58), '4월 월세', housing, bank, 700_000),
    entry(daysAgo(28), '5월 월세', housing, bank, 700_000),

    // 통신비
    entry(daysAgo(85), '3월 통신비', telecom, bank, 55_000),
    entry(daysAgo(55), '4월 통신비', telecom, bank, 55_000),
    entry(daysAgo(25), '5월 통신비', telecom, bank, 55_000),

    // 식비
    entry(daysAgo(87), '마트 장보기', food, card, 95_000),
    entry(daysAgo(82), '점심 외식', food, cash, 12_000),
    entry(daysAgo(79), '저녁 외식', food, cash, 35_000),
    entry(daysAgo(70), '편의점', food, cash, 8_500),
    entry(daysAgo(65), '배달 음식', food, card, 28_000),
    entry(daysAgo(57), '마트 장보기', food, card, 78_000),
    entry(daysAgo(50), '회식', food, card, 45_000),
    entry(daysAgo(42), '카페', food, cash, 15_000),
    entry(daysAgo(35), '마트 장보기', food, card, 112_000),
    entry(daysAgo(27), '점심 외식', food, cash, 11_000),
    entry(daysAgo(21), '저녁 외식', food, card, 62_000),
    entry(daysAgo(14), '배달 음식', food, card, 33_000),
    entry(daysAgo(7), '마트 장보기', food, card, 89_000),
    entry(daysAgo(3), '편의점', food, cash, 6_800),
    entry(daysAgo(1), '카페', food, card, 18_500),

    // 교통비
    entry(daysAgo(86), '지하철 충전', transport, cash, 50_000),
    entry(daysAgo(56), '주유', transport, card, 80_000),
    entry(daysAgo(26), '지하철 충전', transport, cash, 50_000),
    entry(daysAgo(10), '택시', transport, cash, 15_000),

    // 의료비
    entry(daysAgo(45), '병원 진료', health, card, 18_000),
    entry(daysAgo(15), '약국', health, cash, 9_500),

    // 문화/여가
    entry(daysAgo(72), '영화 관람', culture, card, 28_000),
    entry(daysAgo(48), '도서 구매', culture, card, 32_000),
    entry(daysAgo(18), 'OTT 구독', culture, card, 13_900),

    // 기타
    entry(daysAgo(80), '생활용품 구입', other, card, 43_000),
    entry(daysAgo(40), '미용실', other, cash, 30_000),
    entry(daysAgo(8), '선물 구매', other, card, 55_000),

    // 카드값 결제
    entry(daysAgo(62), '신용카드 결제', cardDebt, bank, 350_000),
    entry(daysAgo(32), '신용카드 결제', cardDebt, bank, 420_000),
  ]
}
