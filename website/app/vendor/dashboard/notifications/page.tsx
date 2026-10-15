'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { markNotificationsRead, markNotificationRead } from '@/lib/supabase_queries'
import { describeNotification, isBillingNotification, notificationHref, timeAgo } from '@/lib/notifications'
import { useVendor } from '@/store/vendorStore'
import { useNotificationStore, useUnreadCount } from '@/store/notificationStore'
import type { NotificationRow } from '@/lib/supabase'

type Filter = 'all' | 'payment' | 'new_order' | 'delivered' | 'billing'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'payment', label: 'Payments' },
  { value: 'new_order', label: 'New orders' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'billing', label: 'Billing' },
]

const matches = (n: NotificationRow, filter: Filter) =>
  filter === 'all' || (filter === 'billing' ? isBillingNotification(n) : n.kind === filter)

export default function NotificationsPage() {
  const { vendor } = useVendor()
  const { items, loaded, markRead } = useNotificationStore()
  const unread = useUnreadCount()
  const [filter, setFilter] = useState<Filter>('all')
  const [markingAll, setMarkingAll] = useState(false)

  if (!vendor) return null

  const shown = items.filter((n) => matches(n, filter))

  async function handleMarkAll() {
    setMarkingAll(true)
    const { error } = await markNotificationsRead(vendor!.id)
    if (!error) markRead('all')
    setMarkingAll(false)
  }

  function handleOpen(n: NotificationRow) {
    if (n.read_at) return
    markRead(n.id)
    markNotificationRead(n.id)
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#e0e5f9]">Notifications</h1>
          <p className="text-[#a5abbd] mt-0.5 text-sm">
            {unread > 0 ? `${unread} unread` : 'You’re all caught up'}
          </p>
        </div>
        <button onClick={handleMarkAll} disabled={unread === 0 || markingAll}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#152035] text-[#a5abbd] hover:bg-[#1c2a42] hover:text-[#e0e5f9] transition disabled:opacity-40 disabled:cursor-not-allowed">
          {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
          Mark all as read
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {FILTERS.map(({ value, label }) => (
          <button key={value} onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filter === value ? 'bg-[#ff923e] text-white' : 'bg-[#152035] text-[#a5abbd] hover:bg-[#1c2a42] hover:text-[#e0e5f9]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {!loaded ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-18 bg-[#152035] rounded-2xl animate-pulse" />)}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[#1c2a42] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-[#a5abbd]/40" />
          </div>
          <p className="text-[#a5abbd] font-medium">No notifications yet</p>
          <p className="text-[#a5abbd]/60 text-sm mt-1">Payments, new orders and deliveries show up here as they happen</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {shown.map((n) => {
            const view = describeNotification(n)
            return (
              <li key={n.id}>
                <Link href={notificationHref(n)} onClick={() => handleOpen(n)}
                  className={`flex items-start gap-4 px-5 py-4 rounded-2xl transition ${
                    n.read_at ? 'bg-[#0d1525] hover:bg-[#111a2e]' : 'bg-[#152035] hover:bg-[#1c2a42]'
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${view.tone}`}>
                    <view.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${n.read_at ? 'font-medium text-[#a5abbd]' : 'font-semibold text-[#e0e5f9]'}`}>{view.title}</p>
                      {!n.read_at && <span className="w-1.5 h-1.5 rounded-full bg-[#ff923e]" aria-label="Unread" />}
                    </div>
                    <p className="text-sm text-[#a5abbd] mt-0.5">{view.body}</p>
                  </div>
                  <span className="text-xs text-[#a5abbd]/70 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
