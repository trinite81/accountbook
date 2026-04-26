import { NavLink, Outlet } from 'react-router-dom'
import { BookOpen, Settings, BarChart2, BookMarked, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

const navItems = [
  { to: '/', label: '거래입력', icon: BookOpen },
  { to: '/reports', label: '분석', icon: BarChart2 },
  { to: '/settings', label: '설정', icon: Settings },
]

export function Layout() {
  const { user, signOut } = useAuthStore()
  const email = user?.email ?? ''

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── 데스크톱 사이드바 (lg+) ── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r bg-card sticky top-0 h-screen overflow-y-auto">
        <div className="px-5 py-6 border-b">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-tight">가계부</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 pl-7">복식부기 가계부</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* 사용자 / 로그아웃 */}
        <div className="p-3 border-t">
          <p className="text-xs text-muted-foreground truncate px-2 mb-1">{email}</p>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* ── 모바일/태블릿 상단 헤더 (<lg) ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
          <div className="px-4 h-14 flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-tight">가계부</span>
          </div>
        </header>

        {/* ── 메인 컨텐츠 ── */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-4 py-6 pb-24 lg:pb-8">
            <Outlet />
          </div>
        </main>

        {/* ── 모바일 하단 탭 바 (<lg) ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white safe-area-inset-bottom">
          <div className="flex h-16">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('h-5 w-5', isActive && 'scale-110 transition-transform')} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

    </div>
  )
}
