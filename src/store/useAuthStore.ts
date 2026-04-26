import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthStore {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  setLoading: (v: boolean) => void
  signInWithEmail: (email: string, password: string) => Promise<string | null>
  signUpWithEmail: (email: string, password: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  async signInWithEmail(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? toKorean(error.message) : null
  },

  async signUpWithEmail(email, password) {
    const { error } = await supabase.auth.signUp({ email, password })
    return error ? toKorean(error.message) : null
  },

  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return error ? toKorean(error.message) : null
  },

  async signOut() {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))

function toKorean(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (msg.includes('User already registered')) return '이미 사용 중인 이메일입니다.'
  if (msg.includes('Password should be at least 6')) return '비밀번호는 6자 이상이어야 합니다.'
  if (msg.includes('Email not confirmed')) return '이메일 인증이 필요합니다. 메일함을 확인해주세요.'
  if (msg.includes('Unable to validate email')) return '유효하지 않은 이메일 주소입니다.'
  return msg
}
