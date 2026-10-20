'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Package, LayoutDashboard, ShoppingBag, Tag, ClipboardList, LogOut, Menu, Loader2, User, Bot, ChevronDown,
  Plus, Settings, KeyRound, Bell, CreditCard, ChevronsLeft, ChevronsRight, Moon, Sun, X,
} from 'lucide-react'
import {
  getSession, signOut, getVendorsByUserId, getVendorNotifications, onVendorNotification, getAwaitingAcceptCount,
} from '@/lib/supabase_queries'
import { useVendorStore, useVendor } from '@/store/vendorStore'
import { useNotificationStore, useUnreadCount } from '@/store/notificationStore'
import type { VendorRow, NotificationRow } from '@/lib/supabase'
import { describeNotification, isBillingNotification, notificationHref } from '@/lib/notifications'
import ChangePasswordModal from '@/components/ChangePasswordModal'

export { useVendor }

const THEME_KEY = 'asap-vendor-theme'
const COLLAPSED_KEY = 'asap-vendor-sidebar-collapsed'

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; badge?: 'orders' | 'notifications' }

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'General',
    items: [
      { href: '/vendor/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/vendor/dashboard/orders', label: 'Orders', icon: ClipboardList, badge: 'orders' },
      { href: '/vendor/dashboard/items', label: 'Items', icon: ShoppingBag },
      { href: '/vendor/dashboard/categories', label: 'Categories', icon: Tag },
    ],
  },
  {
    title: 'Tools',
    items: [
      { href: '/vendor/dashboard/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
      { href: '/vendor/dashboard/bot', label: 'Bot', icon: Bot },
      { href: '/vendor/dashboard/billing', label: 'Billing', icon: CreditCard },
      { href: '/vendor/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
]

function readSetting(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}

function writeSetting(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch {}
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { vendor, vendors, setVendor, setVendors, clearVendor } = useVendorStore()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)
  const [storeSwitcherOpen, setStoreSwitcherOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [toast, setToast] = useState<NotificationRow | null>(null)
  const [awaiting, setAwaiting] = useState(0)
  const unread = useUnreadCount()
  const vendorId = vendor?.id ?? null

  // The active store's notifications: latest 50, then live inserts
  useEffect(() => {
    const feed = useNotificationStore.getState()
    feed.reset(vendorId)
    if (vendorId === null) return
    let cancelled = false
    getVendorNotifications(vendorId).then(({ data }) => {
      if (!cancelled) feed.setItems((data ?? []) as NotificationRow[])
    })
    getAwaitingAcceptCount(vendorId).then((n) => { if (!cancelled) setAwaiting(n) })
    const unsubscribe = onVendorNotification(vendorId, (row) => {
      feed.add(row)
      setToast(row)
      // A new order or a status change usually arrives with a notification
      getAwaitingAcceptCount(vendorId).then((n) => { if (!cancelled) setAwaiting(n) })
    })
    return () => { cancelled = true; unsubscribe() }
  }, [vendorId])

  // Toasts clear themselves after 6s
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await getSession()
      const user = session?.user
      if (!user) { router.replace('/login'); return }

      const { data: rows } = await getVendorsByUserId(user.id)
      const list = (rows ?? []) as VendorRow[]
      if (list.length === 0) { await signOut(); router.replace('/login'); return }

      setDark(readSetting(THEME_KEY) === 'dark')
      setCollapsed(readSetting(COLLAPSED_KEY) === '1')
      setVendors(list)
      // Keep existing active store if still valid, otherwise default to first
      const current = useVendorStore.getState().vendor
      const stillValid = current && list.find((v) => v.id === current.id)
      setVendor(stillValid ? current : list[0])
      setLoading(false)
    }
    init()
  }, [router, setVendor, setVendors])

  async function handleSignOut() {
    await signOut()
    clearVendor()
    router.push('/login')
  }

  function toggleTheme() {
    setDark((d) => { writeSetting(THEME_KEY, d ? 'light' : 'dark'); return !d })
  }

  function toggleCollapsed() {
    setCollapsed((c) => { writeSetting(COLLAPSED_KEY, c ? '0' : '1'); return !c })
    setStoreSwitcherOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#05070d]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff923e]" />
      </div>
    )
  }

  const badgeCount = (badge?: NavItem['badge']) =>
    badge === 'orders' ? awaiting : badge === 'notifications' ? unread : 0
  const isActive = (href: string) =>
    href === '/vendor/dashboard' ? pathname === href : pathname.startsWith(href)
  const initial = (vendor?.name ?? '?').trim().charAt(0).toUpperCase()

  // An element, not a component: a component defined in render remounts on every render.
  // `wide` is false for the collapsed desktop rail; the mobile drawer is always wide.
  const sidebar = (wide: boolean) => (
    <aside className="flex flex-col h-full text-v-frame-text">
      <div className={`flex items-center h-20 shrink-0 ${wide ? 'px-5 justify-between' : 'justify-center'}`}>
        <Link href="/" className="flex items-center gap-2.5" aria-label="ASAP home">
          <div className="bg-linear-to-br from-[#ff923e] to-[#c46018] p-2 rounded-xl">
            <Package className="w-5 h-5 text-white" />
          </div>
          {wide && <span className="text-xl font-bold tracking-tight">ASAP.</span>}
        </Link>
        {wide && (
          <>
            <button onClick={toggleCollapsed} aria-label="Collapse sidebar"
              className="hidden lg:flex w-9 h-9 rounded-xl bg-v-frame-hover items-center justify-center text-v-frame-muted hover:text-v-frame-text transition cursor-pointer">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setSidebarOpen(false)} aria-label="Close menu"
              className="lg:hidden w-9 h-9 rounded-xl bg-v-frame-hover flex items-center justify-center text-v-frame-muted cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      {!wide && (
        <button onClick={toggleCollapsed} aria-label="Expand sidebar"
          className="mx-auto mb-2 w-9 h-9 rounded-xl bg-v-frame-hover flex items-center justify-center text-v-frame-muted hover:text-v-frame-text transition cursor-pointer">
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}

      <div className="border-t border-v-frame-hover" />

      {/* Store switcher */}
      <div className={`py-4 ${wide ? 'px-4' : 'px-3'}`}>
        <p className={`text-xs text-v-frame-muted mb-2 ${wide ? 'px-1' : 'text-center'}`}>Store</p>
        <div className="relative">
          <button onClick={() => setStoreSwitcherOpen((o) => !o)} aria-expanded={storeSwitcherOpen}
            aria-label={`Store: ${vendor?.name}. Switch store`}
            className={`w-full flex items-center gap-3 p-1.5 bg-v-frame-hover rounded-2xl hover:opacity-90 transition cursor-pointer ${wide ? '' : 'justify-center'}`}>
            <span className="w-9 h-9 rounded-xl bg-linear-to-br from-[#ff923e] to-[#c46018] flex items-center justify-center shrink-0 text-white font-bold">
              {initial}
            </span>
            {wide && (
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-semibold truncate">{vendor?.name}</span>
                <span className="block text-xs text-v-frame-muted capitalize">{vendor?.acct_type}</span>
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-v-frame-muted shrink-0 transition-transform ${storeSwitcherOpen ? 'rotate-180' : ''} ${wide ? 'mr-1' : 'hidden'}`} />
          </button>

          {storeSwitcherOpen && (
            <div className={`absolute z-50 w-60 bg-v-modal text-v-text rounded-2xl p-1.5 border border-v-line shadow-[0_16px_40px_rgba(0,0,0,0.25)] ${
              wide ? 'left-0 right-0 w-auto top-full mt-2' : 'left-full top-0 ml-3'}`}>
              {vendors.map((v) => (
                <button key={v.id} onClick={() => { setVendor(v); setStoreSwitcherOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition cursor-pointer ${
                    vendor?.id === v.id ? 'bg-[#ff923e]/10 text-[#c46018]' : 'hover:bg-v-card'}`}>
                  <span className="w-7 h-7 rounded-lg bg-v-raised flex items-center justify-center text-xs font-bold shrink-0">
                    {v.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate font-medium">{v.name}</span>
                </button>
              ))}
              <Link href="/become-vendor" onClick={() => setStoreSwitcherOpen(false)}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-v-muted hover:bg-v-card hover:text-v-text transition">
                <span className="w-7 h-7 rounded-lg border border-dashed border-v-line flex items-center justify-center shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </span>
                Add new store
              </Link>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title} className={`border-t border-v-frame-hover py-4 ${wide ? 'px-4' : 'px-3'}`}>
            <p className={`text-xs text-v-frame-muted mb-2 ${wide ? 'px-1' : 'text-center'}`}>{group.title}</p>
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon, badge }) => {
                const active = isActive(href)
                const count = badgeCount(badge)
                return (
                  <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                    title={wide ? undefined : label} aria-label={count > 0 ? `${label}, ${count} new` : label}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center gap-3 rounded-xl text-sm transition-all ${
                      wide ? 'px-3 py-2.5' : 'justify-center h-11'} ${
                      active ? 'bg-v-frame-hover font-semibold' : 'text-v-frame-muted hover:text-v-frame-text hover:bg-v-frame-hover/60'}`}>
                    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#ff923e]' : ''}`} strokeWidth={active ? 2.25 : 1.75} />
                    {wide && <span className="flex-1">{label}</span>}
                    {count > 0 && (wide ? (
                      <span className="min-w-6 h-6 px-1.5 rounded-lg bg-[#ff923e] text-white text-xs font-semibold flex items-center justify-center">
                        {count > 99 ? '99+' : count}
                      </span>
                    ) : (
                      <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#ff923e]" />
                    ))}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`border-t border-v-frame-hover py-3 space-y-1 ${wide ? 'px-4' : 'px-3'}`}>
        {[
          { label: dark ? 'Light mode' : 'Dark mode', icon: dark ? Sun : Moon, onClick: toggleTheme },
          { label: 'Change password', icon: KeyRound, onClick: () => { setChangingPassword(true); setSidebarOpen(false) } },
        ].map(({ label, icon: Icon, onClick }) => (
          <button key={label} onClick={onClick} title={wide ? undefined : label} aria-label={label}
            className={`w-full flex items-center gap-3 rounded-xl text-sm text-v-frame-muted hover:text-v-frame-text hover:bg-v-frame-hover/60 transition cursor-pointer ${
              wide ? 'px-3 py-2.5' : 'justify-center h-11'}`}>
            <Icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
            {wide && label}
          </button>
        ))}
        <Link href="/home" title={wide ? undefined : 'User view'} aria-label="Switch to user view"
          className={`flex items-center gap-3 rounded-xl text-sm text-v-frame-muted hover:text-v-frame-text hover:bg-v-frame-hover/60 transition ${
            wide ? 'px-3 py-2.5' : 'justify-center h-11'}`}>
          <User className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          {wide && 'Switch to user view'}
        </Link>
        <button onClick={handleSignOut} title={wide ? undefined : 'Sign out'} aria-label="Sign out"
          className={`w-full flex items-center gap-3 rounded-xl text-sm text-v-frame-muted hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer ${
            wide ? 'px-3 py-2.5' : 'justify-center h-11'}`}>
          <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          {wide && 'Sign out'}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="vendor-theme h-dvh flex p-2 lg:p-3 lg:gap-3" data-theme={dark ? 'dark' : 'light'}>
      <div className={`hidden lg:block shrink-0 transition-[width] duration-300 ${collapsed ? 'w-[84px]' : 'w-64'}`}>
        {sidebar(!collapsed)}
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-v-frame">{sidebar(true)}</div>
        </div>
      )}

      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}

      {/* Live notification toast */}
      <div aria-live="polite" className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-60 pointer-events-none">
        {toast && (() => {
          const view = describeNotification(toast)
          return (
            <Link href={isBillingNotification(toast) ? notificationHref(toast) : '/vendor/dashboard/notifications'}
              onClick={() => setToast(null)}
              className="pointer-events-auto flex items-start gap-3 bg-v-modal border border-v-line rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)] hover:bg-v-card transition">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${view.tone}`}>
                <view.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-v-text">{view.title}</p>
                <p className="text-xs text-v-muted mt-0.5">{view.body}</p>
              </div>
            </Link>
          )
        })()}
      </div>

      {/* The content panel: the page scrolls inside it, the frame never moves */}
      <div className="flex-1 min-w-0 flex flex-col bg-v-surface rounded-[22px] lg:rounded-[28px] overflow-hidden">
        <header className="shrink-0 h-16 flex items-center justify-between gap-3 px-4 sm:px-8 border-b border-v-line">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open menu"
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-v-muted hover:bg-v-card hover:text-v-text cursor-pointer">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <Link href="/vendor/dashboard/notifications" aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-v-muted hover:bg-v-card hover:text-v-text transition">
              <Bell className="w-5 h-5" />
              {unread > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#ff923e] ring-2 ring-v-surface" />}
            </Link>
            <div className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full bg-v-card">
              <span className="w-7 h-7 rounded-full bg-linear-to-br from-[#ff923e] to-[#c46018] flex items-center justify-center text-white text-xs font-bold">
                {initial}
              </span>
              <span className="text-sm font-semibold text-v-text max-w-40 truncate">{vendor?.name}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
