import type { Account, JournalEntry } from '@/types'
import { generateId } from './utils'

export function generateSampleEntries(accounts: Account[]): Omit<JournalEntry, 'bookId' | 'userId'>[] {
  const get = (name: string) => accounts.find((a) => a.name === name)?.id ?? ''

  const cash         = get('현금')
  const bank         = get('은행계좌')
  const card         = get('신용카드')
  const cardDebt     = get('신용카드미결제')
  const salary       = get('급여')
  const sideIncome   = get('부수입')
  const interestIncome = get('이자수입')
  const food         = get('식비')
  const transport    = get('교통비')
  const housing      = get('주거비')
  const telecom      = get('통신비')
  const health       = get('의료비')
  const culture      = get('문화/여가')
  const other        = get('기타비용')

  const nowISO = new Date().toISOString()

  // bookId, userId는 import 시점에 store가 주입
  function makeEntry(date: string, description: string, debitId: string, creditId: string, amount: number): Omit<JournalEntry, 'bookId' | 'userId'> {
    return {
      id: generateId(),
      date,
      description,
      lines: [
        { accountId: debitId, debit: amount, credit: 0 },
        { accountId: creditId, debit: 0, credit: amount },
      ],
      createdAt: nowISO,
      updatedAt: nowISO,
    }
  }

  function fmt(year: number, month: number, day: number): string {
    const lastDay = new Date(year, month, 0).getDate()
    const d = Math.min(day, lastDay)
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function dayOfWeek(year: number, month: number, day: number): number {
    return new Date(year, month - 1, day).getDay() // 0=Sun, 6=Sat
  }

  // Collect target months (past 12 months including current)
  const today = new Date()
  const months: Array<{ year: number; month: number; idx: number }> = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, idx: 11 - i })
  }

  const lunchItems = [
    ['직장 근처 한식', 8_500], ['편의점 점심', 4_500], ['김밥천국', 7_000],
    ['설렁탕', 10_000], ['비빔밥', 9_000], ['냉면', 11_000],
    ['돈까스 정식', 9_500], ['백반', 7_500], ['국밥', 8_000],
    ['초밥 런치', 13_000], ['우동', 8_000], ['덮밥', 9_000],
    ['샐러드 카페', 11_000], ['짜장면', 7_000], ['볶음밥', 8_500],
    ['칼국수', 9_000], ['라면 + 공기밥', 5_500], ['샌드위치', 6_500],
  ] as const

  const dinnerItems = [
    ['저녁 외식', 18_000], ['치킨 배달', 22_000], ['피자 배달', 28_000],
    ['족발 배달', 32_000], ['삼겹살', 35_000], ['고깃집', 45_000],
    ['중국집', 15_000], ['파스타 레스토랑', 22_000], ['일식당', 28_000],
    ['샤부샤부', 38_000], ['보쌈 배달', 26_000], ['분식', 12_000],
    ['버거킹', 10_000], ['국밥', 9_000], ['편의점 저녁', 6_500],
  ] as const

  const cafeItems = [
    ['스타벅스', 6_500], ['카페라떼', 5_000], ['편의점 커피', 2_000],
    ['투썸플레이스', 6_800], ['이디야', 4_500], ['메가커피', 3_000],
    ['할리스', 5_500], ['빽다방', 3_500],
  ] as const

  const groceryItems = [
    ['이마트 장보기', 65_000], ['홈플러스 장보기', 58_000],
    ['쿠팡 식료품', 72_000], ['재래시장 장보기', 45_000],
    ['마트 장보기', 80_000], ['편의점 생필품', 18_000],
  ] as const

  const cultureItems = [
    ['영화 관람', 14_000], ['OTT 구독', 13_900], ['도서 구매', 18_000],
    ['음악 스트리밍', 10_900], ['전시회 입장', 12_000], ['스포츠 관람', 45_000],
    ['보드게임 카페', 25_000], ['콘서트 관람', 88_000], ['게임 구매', 33_000],
    ['영화 관람', 14_000], ['독서실 이용', 8_000], ['수영장', 15_000],
  ] as const

  const otherItems = [
    ['미용실', 32_000, cash], ['생활용품 구입', 45_000, card],
    ['의류 구입', 89_000, card], ['선물 구매', 55_000, card],
    ['세탁비', 15_000, cash], ['주방용품', 38_000, card],
    ['가전제품 구입', 220_000, card], ['화장품', 67_000, card],
    ['운동화 구입', 95_000, card], ['가방 구입', 75_000, card],
    ['안경점', 180_000, card], ['문구류', 12_000, cash],
  ] as const

  const medItems = [
    ['병원 진료', 18_000, card], ['약국', 8_500, cash],
    ['치과 진료', 120_000, card], ['안과 진료', 15_000, card],
    ['한의원', 30_000, cash], ['약국', 12_000, cash],
  ] as const

  const entries: Omit<JournalEntry, 'bookId' | 'userId'>[] = []

  for (const { year, month, idx } of months) {
    const lastDay = new Date(year, month, 0).getDate()

    // Deterministic per-month RNG (linear congruential generator)
    let seed = (year * 100 + month) * 6364136223846793005 | 0
    function rng(max: number): number {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0
      return Math.abs(seed) % max
    }

    // ── Fixed monthly items ──
    entries.push(makeEntry(fmt(year, month, 21), `${month}월 급여 수령`, bank, salary, 3_500_000))
    entries.push(makeEntry(fmt(year, month, 1),  `${month}월 월세`,      housing, bank, 700_000))
    entries.push(makeEntry(fmt(year, month, 10), `${month}월 통신비`,    telecom, bank, 55_000))
    entries.push(makeEntry(fmt(year, month, 25), `${month}월 카드값 결제`, cardDebt, bank, 380_000 + rng(120_000)))

    // ── Quarterly interest income ──
    if (month % 3 === 1) {
      entries.push(makeEntry(fmt(year, month, 15), '이자수입', bank, interestIncome, 25_000 + rng(15_000)))
    }

    // ── Irregular side income (~4 months out of 12) ──
    if (idx % 3 === 1) entries.push(makeEntry(fmt(year, month, 8 + rng(6)), '프리랜서 작업비', cash, sideIncome, 250_000 + rng(350_000)))
    if (idx % 5 === 2) entries.push(makeEntry(fmt(year, month, 12 + rng(5)), '중고물품 판매', cash, sideIncome, 40_000 + rng(120_000)))
    if (idx % 7 === 4) entries.push(makeEntry(fmt(year, month, 18 + rng(4)), '블로그 광고 수익', bank, sideIncome, 70_000 + rng(90_000)))

    // ── Daily transactions ──
    for (let day = 1; day <= lastDay; day++) {
      const d = dayOfWeek(year, month, day)
      const isWeekend = d === 0 || d === 6
      const dateStr = fmt(year, month, day)

      // Lunch — every weekday
      if (!isWeekend) {
        const [desc, baseAmt] = lunchItems[rng(lunchItems.length)]
        entries.push(makeEntry(dateStr, desc, food, rng(4) < 3 ? card : cash, baseAmt + rng(3_000)))
      }

      // Morning cafe/beverage — most days
      if (rng(10) < (isWeekend ? 6 : 8)) {
        const [desc, amt] = cafeItems[rng(cafeItems.length)]
        entries.push(makeEntry(dateStr, desc, food, rng(3) < 2 ? card : cash, amt))
      }

      // Dinner / delivery — most evenings
      if (rng(10) < (isWeekend ? 9 : 7)) {
        const [desc, baseAmt] = dinnerItems[rng(dinnerItems.length)]
        entries.push(makeEntry(dateStr, desc, food, rng(3) < 2 ? card : cash, baseAmt + rng(8_000)))
      }

      // Snack / convenience store — ~every other day
      if (rng(2) === 0) {
        entries.push(makeEntry(dateStr, '편의점', food, rng(2) === 0 ? card : cash, 2_500 + rng(5_000)))
      }

      // Grocery shopping — roughly twice a week
      if (rng(4) === 0) {
        const [desc, baseAmt] = groceryItems[rng(groceryItems.length)]
        entries.push(makeEntry(dateStr, desc, food, card, baseAmt + rng(30_000)))
      }

      // Commute transit — every weekday
      if (!isWeekend) {
        entries.push(makeEntry(dateStr, '대중교통', transport, cash, 1_400 + rng(300)))
        // Evening return transit
        if (rng(10) < 8) {
          entries.push(makeEntry(dateStr, '대중교통 귀가', transport, cash, 1_400 + rng(300)))
        }
        // Occasional taxi
        if (rng(8) === 0) {
          entries.push(makeEntry(dateStr, '택시', transport, cash, 6_000 + rng(14_000)))
        }
      }

      // Weekend driving / transport
      if (isWeekend && rng(3) === 0) {
        if (rng(2) === 0) {
          entries.push(makeEntry(dateStr, '주유', transport, card, 55_000 + rng(30_000)))
        } else {
          entries.push(makeEntry(dateStr, '버스/택시', transport, cash, 8_000 + rng(12_000)))
        }
      }

      // Culture — roughly 1-2 per week
      if (rng(7) === 0) {
        const [desc, amt] = cultureItems[rng(cultureItems.length)]
        entries.push(makeEntry(dateStr, desc, culture, card, amt))
      }

      // Medical — rare (~2/month)
      if (rng(18) === 0) {
        const [desc, amt, pay] = medItems[rng(medItems.length)]
        entries.push(makeEntry(dateStr, desc, health, pay, amt))
      }

      // Other misc — ~3-4/month
      if (rng(9) === 0) {
        const [desc, amt, pay] = otherItems[rng(otherItems.length)]
        entries.push(makeEntry(dateStr, desc, other, pay, amt))
      }
    }
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date))
}
