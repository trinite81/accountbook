import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { TransactionPage } from '@/pages/TransactionPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { useAccountStore } from '@/store/useAccountStore'
import { useEntryStore } from '@/store/useEntryStore'

export default function App() {
  const initAccounts = useAccountStore((s) => s.init)
  const initEntries = useEntryStore((s) => s.init)

  useEffect(() => {
    initAccounts()
    initEntries()
  }, [initAccounts, initEntries])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TransactionPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
