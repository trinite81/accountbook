import type { Account, JournalEntry } from '@/types'
import { generateId } from './utils'

// ── 공통 유틸 ──────────────────────────────────────────────────────

function fmt(year: number, month: number, day: number): string {
  const lastDay = new Date(year, month, 0).getDate()
  const d = Math.min(day, lastDay)
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function dayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay() // 0=Sun, 6=Sat
}

function makeRng(seed: number) {
  let s = seed | 0
  return (max: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    return Math.abs(s) % max
  }
}

function collectMonths() {
  const today = new Date()
  const months: Array<{ year: number; month: number; idx: number }> = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, idx: 11 - i })
  }
  return months
}

// ── 단독 사용자 샘플 데이터 ────────────────────────────────────────

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

  for (const { year, month, idx } of collectMonths()) {
    const lastDay = new Date(year, month, 0).getDate()
    const rng = makeRng((year * 100 + month) * 6364136223846793005)

    entries.push(makeEntry(fmt(year, month, 21), `${month}월 급여 수령`, bank, salary, 3_500_000))
    entries.push(makeEntry(fmt(year, month, 1),  `${month}월 월세`,      housing, bank, 700_000))
    entries.push(makeEntry(fmt(year, month, 10), `${month}월 통신비`,    telecom, bank, 55_000))
    entries.push(makeEntry(fmt(year, month, 25), `${month}월 카드값 결제`, cardDebt, bank, 380_000 + rng(120_000)))

    if (month % 3 === 1) {
      entries.push(makeEntry(fmt(year, month, 15), '이자수입', bank, interestIncome, 25_000 + rng(15_000)))
    }
    if (idx % 3 === 1) entries.push(makeEntry(fmt(year, month, 8 + rng(6)), '프리랜서 작업비', cash, sideIncome, 250_000 + rng(350_000)))
    if (idx % 5 === 2) entries.push(makeEntry(fmt(year, month, 12 + rng(5)), '중고물품 판매', cash, sideIncome, 40_000 + rng(120_000)))
    if (idx % 7 === 4) entries.push(makeEntry(fmt(year, month, 18 + rng(4)), '블로그 광고 수익', bank, sideIncome, 70_000 + rng(90_000)))

    for (let day = 1; day <= lastDay; day++) {
      const isWeekend = [0, 6].includes(dayOfWeek(year, month, day))
      const dateStr = fmt(year, month, day)

      if (!isWeekend) {
        const [desc, baseAmt] = lunchItems[rng(lunchItems.length)]
        entries.push(makeEntry(dateStr, desc, food, rng(4) < 3 ? card : cash, baseAmt + rng(3_000)))
      }
      if (rng(10) < (isWeekend ? 6 : 8)) {
        const [desc, amt] = cafeItems[rng(cafeItems.length)]
        entries.push(makeEntry(dateStr, desc, food, rng(3) < 2 ? card : cash, amt))
      }
      if (rng(10) < (isWeekend ? 9 : 7)) {
        const [desc, baseAmt] = dinnerItems[rng(dinnerItems.length)]
        entries.push(makeEntry(dateStr, desc, food, rng(3) < 2 ? card : cash, baseAmt + rng(8_000)))
      }
      if (rng(2) === 0) entries.push(makeEntry(dateStr, '편의점', food, rng(2) === 0 ? card : cash, 2_500 + rng(5_000)))
      if (rng(4) === 0) {
        const [desc, baseAmt] = groceryItems[rng(groceryItems.length)]
        entries.push(makeEntry(dateStr, desc, food, card, baseAmt + rng(30_000)))
      }
      if (!isWeekend) {
        entries.push(makeEntry(dateStr, '대중교통', transport, cash, 1_400 + rng(300)))
        if (rng(10) < 8) entries.push(makeEntry(dateStr, '대중교통 귀가', transport, cash, 1_400 + rng(300)))
        if (rng(8) === 0) entries.push(makeEntry(dateStr, '택시', transport, cash, 6_000 + rng(14_000)))
      }
      if (isWeekend && rng(3) === 0) {
        if (rng(2) === 0) entries.push(makeEntry(dateStr, '주유', transport, card, 55_000 + rng(30_000)))
        else entries.push(makeEntry(dateStr, '버스/택시', transport, cash, 8_000 + rng(12_000)))
      }
      if (rng(7) === 0) {
        const [desc, amt] = cultureItems[rng(cultureItems.length)]
        entries.push(makeEntry(dateStr, desc, culture, card, amt))
      }
      if (rng(18) === 0) {
        const [desc, amt, pay] = medItems[rng(medItems.length)]
        entries.push(makeEntry(dateStr, desc, health, pay, amt))
      }
      if (rng(9) === 0) {
        const [desc, amt, pay] = otherItems[rng(otherItems.length)]
        entries.push(makeEntry(dateStr, desc, other, pay, amt))
      }
    }
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

// ── 2인 공유 샘플 데이터 ──────────────────────────────────────────
// userId1: 직장인 프로필 (고정급여, 출퇴근, 외식 중심)
// userId2: 프리랜서 프로필 (가변수입, 배달·장보기·온라인쇼핑 중심)

export function generateSharedSampleEntries(
  accounts: Account[],
  userId1: string,
  userId2: string,
): Omit<JournalEntry, 'bookId'>[] {
  const get = (name: string) => accounts.find((a) => a.name === name)?.id ?? ''

  const cash     = get('현금')
  const bank     = get('은행계좌')
  const card     = get('신용카드')
  const cardDebt = get('신용카드미결제')
  const salary   = get('급여')
  const side     = get('부수입')
  const interest = get('이자수입')
  const food     = get('식비')
  const transport = get('교통비')
  const housing  = get('주거비')
  const telecom  = get('통신비')
  const health   = get('의료비')
  const culture  = get('문화/여가')
  const other    = get('기타비용')

  const nowISO = new Date().toISOString()

  function e(uid: string, date: string, desc: string, dr: string, cr: string, amt: number): Omit<JournalEntry, 'bookId'> {
    return {
      id: generateId(), userId: uid, date, description: desc,
      lines: [{ accountId: dr, debit: amt, credit: 0 }, { accountId: cr, debit: 0, credit: amt }],
      createdAt: nowISO, updatedAt: nowISO,
    }
  }

  // ── 공통 항목 목록 ──
  const lunches  = ['직장 근처 한식', '편의점 점심', '김밥천국', '설렁탕', '비빔밥', '국밥', '돈까스 정식', '백반', '칼국수', '우동'] as const
  const cafes    = ['스타벅스', '카페라떼', '편의점 커피', '투썸플레이스', '이디야', '메가커피'] as const
  const dinners  = ['저녁 외식', '삼겹살', '중국집', '파스타', '분식', '국밥', '일식당'] as const
  const deliveries = ['치킨 배달', '피자 배달', '족발 배달', '보쌈 배달', '중국집 배달', '버거 배달', '샐러드 배달'] as const
  const groceries  = ['이마트 장보기', '쿠팡 식료품', '홈플러스 장보기', '재래시장 장보기', '마트 장보기'] as const
  const cultures1  = ['영화 관람', '도서 구매', '스포츠 관람', '보드게임 카페', '수영장'] as const
  const cultures2  = ['넷플릭스', '유튜브 프리미엄', 'OTT 구독', '음악 스트리밍', '웹툰 구독', '게임 구입', '전시회 입장'] as const
  const shopping   = ['쿠팡 쇼핑', '의류 구입', '생활용품 구입', '화장품 구입', '주방용품', '인테리어 소품', '운동용품'] as const
  const meds1      = ['병원 진료', '약국', '치과 진료'] as const
  const meds2      = ['병원 진료', '약국', '필라테스', '헬스장 이용권'] as const

  const entries: Omit<JournalEntry, 'bookId'>[] = []

  for (const { year, month, idx } of collectMonths()) {
    const lastDay = new Date(year, month, 0).getDate()
    const r1 = makeRng((year * 100 + month) * 6364136223846793005)
    const r2 = makeRng(((year * 100 + month) ^ 0xDEAD) * 6364136223846793005)

    // ── User 1: 직장인 ──────────────────────────────────────────
    entries.push(e(userId1, fmt(year, month, 21), `${month}월 급여`, bank, salary, 3_500_000))
    entries.push(e(userId1, fmt(year, month, 1),  `${month}월 월세`, housing, bank, 750_000))
    entries.push(e(userId1, fmt(year, month, 10), `${month}월 통신비`, telecom, bank, 55_000))
    entries.push(e(userId1, fmt(year, month, 25), `${month}월 카드값`, cardDebt, bank, 350_000 + r1(100_000)))
    if (month % 3 === 1) entries.push(e(userId1, fmt(year, month, 15), '이자수입', bank, interest, 20_000 + r1(10_000)))
    if (idx % 4 === 1) entries.push(e(userId1, fmt(year, month, 10 + r1(5)), '부업 수익', cash, side, 150_000 + r1(200_000)))

    for (let day = 1; day <= lastDay; day++) {
      const isWeekend = [0, 6].includes(dayOfWeek(year, month, day))
      const ds = fmt(year, month, day)

      // 평일: 점심, 출퇴근
      if (!isWeekend) {
        entries.push(e(userId1, ds, lunches[r1(lunches.length)], food, r1(4) < 3 ? card : cash, 7_500 + r1(5_000)))
        entries.push(e(userId1, ds, '대중교통', transport, cash, 1_400 + r1(300)))
        if (r1(10) < 7) entries.push(e(userId1, ds, '대중교통 귀가', transport, cash, 1_400 + r1(300)))
        if (r1(9) === 0) entries.push(e(userId1, ds, '택시', transport, cash, 7_000 + r1(13_000)))
      }
      // 커피 (평일 80%, 주말 60%)
      if (r1(10) < (isWeekend ? 6 : 8)) {
        entries.push(e(userId1, ds, cafes[r1(cafes.length)], food, r1(3) < 2 ? card : cash, 3_000 + r1(4_000)))
      }
      // 저녁 외식 (평일 50%, 주말 70%)
      if (r1(10) < (isWeekend ? 7 : 5)) {
        entries.push(e(userId1, ds, dinners[r1(dinners.length)], food, r1(3) < 2 ? card : cash, 12_000 + r1(30_000)))
      }
      // 편의점 간식
      if (r1(3) === 0) entries.push(e(userId1, ds, '편의점', food, card, 2_500 + r1(4_500)))
      // 주말 문화
      if (r1(7) === 0) entries.push(e(userId1, ds, cultures1[r1(cultures1.length)], culture, card, 10_000 + r1(38_000)))
      // 의료
      if (r1(22) === 0) entries.push(e(userId1, ds, meds1[r1(meds1.length)], health, r1(2) === 0 ? cash : card, 8_000 + r1(50_000)))
    }

    // ── User 2: 프리랜서 ─────────────────────────────────────────
    // 가변 프리랜서 수입 (2.0M ~ 5.5M)
    entries.push(e(userId2, fmt(year, month, 5 + r2(12)), '프리랜서 프로젝트', bank, side, 2_000_000 + r2(3_500_000)))
    if (idx % 3 === 0) entries.push(e(userId2, fmt(year, month, 18 + r2(6)), '강의 수입', cash, side, 300_000 + r2(700_000)))
    entries.push(e(userId2, fmt(year, month, 10), `${month}월 통신비`, telecom, bank, 70_000))
    entries.push(e(userId2, fmt(year, month, 25), `${month}월 카드값`, cardDebt, bank, 450_000 + r2(180_000)))

    for (let day = 1; day <= lastDay; day++) {
      const isWeekend = [0, 6].includes(dayOfWeek(year, month, day))
      const ds = fmt(year, month, day)

      // 배달음식 (출퇴근 없으므로 식사 대부분 배달)
      if (r2(10) < (isWeekend ? 8 : 9)) {
        entries.push(e(userId2, ds, deliveries[r2(deliveries.length)], food, card, 9_000 + r2(26_000)))
      }
      // 장보기 (가구 장보기 담당 — 더 자주)
      if (r2(3) === 0) {
        entries.push(e(userId2, ds, groceries[r2(groceries.length)], food, card, 40_000 + r2(80_000)))
      }
      // 온라인 쇼핑 (주 2회 빈도)
      if (r2(5) === 0) {
        entries.push(e(userId2, ds, shopping[r2(shopping.length)], other, card, 15_000 + r2(180_000)))
      }
      // 문화 구독 및 취미 (재택 근무 특성상 더 다양)
      if (r2(4) === 0) {
        entries.push(e(userId2, ds, cultures2[r2(cultures2.length)], culture, card, 5_900 + r2(55_000)))
      }
      // 건강·운동
      if (r2(15) === 0) {
        entries.push(e(userId2, ds, meds2[r2(meds2.length)], health, card, 10_000 + r2(90_000)))
      }
    }
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date))
}
