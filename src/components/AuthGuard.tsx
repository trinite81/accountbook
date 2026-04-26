import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

export function AuthGuard() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/auth" replace />
  return <Outlet />
}
