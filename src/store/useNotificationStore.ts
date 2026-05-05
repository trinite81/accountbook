import { create } from 'zustand'
import type { AppNotification } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

interface NotificationStore {
  notifications: AppNotification[]
  unreadCount: number
  init: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  clearData: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  async init() {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) { console.error('[notifications] init error', error); return }

    const notifications = (data ?? []).map(fromRow)
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    })

    // 실시간 구독
    supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = fromRow(payload.new as Record<string, unknown>)
          set((s) => ({
            notifications: [n, ...s.notifications],
            unreadCount: s.unreadCount + 1,
          }))
        }
      )
      .subscribe()
  },

  async markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    set((s) => {
      const notifications = s.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
    })
  },

  async markAllRead() {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  clearData() {
    supabase.channel('notifications').unsubscribe()
    set({ notifications: [], unreadCount: 0 })
  },
}))

function fromRow(r: Record<string, unknown>): AppNotification {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    type: r.type as AppNotification['type'],
    payload: (r.payload as AppNotification['payload']) ?? {},
    read: r.read as boolean,
    createdAt: r.created_at as string,
  }
}
