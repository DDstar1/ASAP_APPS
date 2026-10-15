import { create } from 'zustand'
import { type NotificationRow } from '@/lib/supabase'

// The active store's notifications; the dashboard layout loads and listens,
// the sidebar badge and the Notifications page read from here
type NotificationStore = {
  vendorId: number | null
  items: NotificationRow[]
  loaded: boolean
  reset: (vendorId: number | null) => void
  setItems: (items: NotificationRow[]) => void
  add: (row: NotificationRow) => void
  markRead: (id: number | 'all') => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  vendorId: null,
  items: [],
  loaded: false,
  reset: (vendorId) => set({ vendorId, items: [], loaded: false }),
  setItems: (items) => set({ items, loaded: true }),
  add: (row) => set((s) => (
    row.vendor_id !== s.vendorId || s.items.some((n) => n.id === row.id)
      ? s
      : { items: [row, ...s.items] }
  )),
  markRead: (id) => set((s) => {
    const now = new Date().toISOString()
    return {
      items: s.items.map((n) => (n.read_at || (id !== 'all' && n.id !== id) ? n : { ...n, read_at: now })),
    }
  }),
}))

export const useUnreadCount = () =>
  useNotificationStore((s) => s.items.reduce((count, n) => count + (n.read_at ? 0 : 1), 0))
