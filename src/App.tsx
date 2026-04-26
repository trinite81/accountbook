import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { AuthGuard } from '@/components/AuthGuard'
import { TransactionPage } from '@/pages/TransactionPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { AuthPage } from '@/pages/AuthPage'
import { useAccountStore } from '@/store/useAccountStore'
import { useEntryStore } from '@/store/useEntryStore'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'

export default function App() {
  const { setUser, setLoading, loading, user } = useAuthStore()
  const initAccounts = useAccountStore((s) => s.init)
  const initEntries = useEntryStore((s) => s.init)
  const clearAccounts = useAccountStore((s) => s.clearData)
  const clearEntries = useEntryStore((s) => s.clearData)

  // 세션 감지
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  // 로그인 시 데이터 로드, 로그아웃 시 초기화
  useEffect(() => {
    if (user) {
      initAccounts()
      initEntries()
    } else {
      clearAccounts()
      clearEntries()
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route index element={<TransactionPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
