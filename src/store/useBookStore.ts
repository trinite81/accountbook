import { create } from 'zustand'
import type { Book, BookMember } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

interface BookStore {
  book: Book | null
  members: BookMember[]
  init: () => Promise<void>
  clearData: () => void
}

export const useBookStore = create<BookStore>((set) => ({
  book: null,
  members: [],

  async init() {
    const user = useAuthStore.getState().user
    if (!user) return

    // 내가 속한 book 조회
    const { data: membership } = await supabase
      .from('book_members')
      .select('book_id, role, joined_at')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    let bookId: string

    if (membership) {
      bookId = membership.book_id
    } else {
      // 첫 로그인 — 개인 book 생성
      const { data: newBook, error } = await supabase
        .from('books')
        .insert({ name: '가계부' })
        .select()
        .single()

      if (error || !newBook) { console.error('[book] create error', error); return }

      await supabase.from('book_members').insert({
        book_id: newBook.id,
        user_id: user.id,
        role: 'owner',
      })

      bookId = newBook.id
    }

    // book 정보 로드
    const { data: bookData } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (!bookData) return

    // 멤버 목록 로드 (이메일은 auth.users 접근 불가 — Step 4 초대 UI에서 별도 처리)
    const { data: membersData } = await supabase
      .from('book_members')
      .select('book_id, user_id, role, joined_at')
      .eq('book_id', bookId)

    set({
      book: fromBookRow(bookData),
      members: (membersData ?? []).map(fromMemberRow),
    })
  },

  clearData() {
    set({ book: null, members: [] })
  },
}))

function fromBookRow(r: Record<string, unknown>): Book {
  return {
    id: r.id as string,
    name: r.name as string,
    createdAt: r.created_at as string,
  }
}

function fromMemberRow(r: Record<string, unknown>): BookMember {
  return {
    bookId: r.book_id as string,
    userId: r.user_id as string,
    role: r.role as 'owner' | 'member',
    joinedAt: r.joined_at as string,
  }
}
