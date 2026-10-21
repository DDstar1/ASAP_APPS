'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Package, Bell, Loader2, Settings } from 'lucide-react'
import { getSession, signOut, getMyAccess, getAppUser } from '@/lib/supabase_queries'
import { getInvestUnread } from '@/lib/invest'
import { InvestContext, type InvestSession } from '@/components/invest/InvestContext'
import AvatarMenu from '@/components/invest/AvatarMenu'
import ChangePasswordModal from '@/components/ChangePasswordModal'

const THEME_KEY = 'asap-invest-theme'

const navItems = [
  { href: '/invest', label: 'Plans' },
  { href: '/invest/assets', label: 'My Assets' },
  { href: '/invest/earnings', label: 'Earnings' },
  { href: '/invest/performance', label: 'Performance' },
  { href: '/invest/messages', label: 'News', badge: 'messages' as const },
]

type Profile = { userId: string; investor: boolean; isVendor: boolean; name: string; photo: string | null }

export default function InvestLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [unread, setUnread] = useState({ notifications: 0, messages: 0 })
  const [dark, setDark] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await getSession()
      const user = session?.user
      if (!user) { router.replace('/login?next=/invest'); return }
      const [{ data: access }, { data: appUser }] = await Promise.all([getMyAccess(), getAppUser(user.id)])
      try { setDark(localStorage.getItem(THEME_KEY) === 'dark') } catch {}
      setProfile({
        userId: user.id,
        investor: !!access?.investor,
        isVendor: (access?.vendor_ids?.length ?? 0) > 0,
        name: appUser?.username || user.email?.split('@')[0] || 'Owner',
        photo: appUser?.profileImage ?? null,
      })
    }
    init()
  }, [router])

  const userId = profile?.userId ?? null
  const refreshUnread = useCallback(() => {
    if (userId) getInvestUnread(userId).then(setUnread)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getInvestUnread(userId).then((counts) => { if (!cancelled) setUnread(counts) })
    return () => { cancelled = true }
  }, [userId])

  const setUsername = useCallback((name: string) => {
    setProfile((p) => p && { ...p, name })
  }, [])

  const value = useMemo<InvestSession | null>(() => profile && {
    userId: profile.userId,
    investor: profile.investor,
    username: profile.name,
    setUsername,
    unreadNotifications: unread.notifications,
    unreadMessages: unread.messages,
    refreshUnread,
  }, [profile, unread, refreshUnread, setUsername])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light') } catch {}
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  if (!profile || !value) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#f4f5f8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff923e]" />
      </div>
    )
  }

  const isActive = (href: string) => href === '/invest'
    ? pathname === '/invest' || pathname.startsWith('/invest/plans') || pathname.startsWith('/invest/checkout')
    : pathname.startsWith(href)

  const navLink = (item: (typeof navItems)[number], compact: boolean) => {
    const active = isActive(item.href)
    const count = item.badge ? unread[item.badge] : 0
    return (
      <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
        className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition ${
          compact ? 'px-3.5 py-2 text-sm' : 'px-4 py-2 text-sm'
        } ${active
          ? 'bg-linear-to-r from-[#ff923e] to-[#c46018] text-white shadow-[0_6px_16px_rgba(255,146,62,0.35)]'
          : 'text-inv-muted hover:text-inv-text hover:bg-inv-soft'}`}>
        {item.label}
        {count > 0 && (
          <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center ${
            active ? 'bg-white text-[#c46018]' : 'bg-[#ff923e] text-white'}`} aria-label={`${count} unread`}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    )
  }

  return (
    <InvestContext.Provider value={value}>
      <div className="invest-theme min-h-dvh" data-theme={dark ? 'dark' : 'light'}>
        <header className="inv-page-bg sticky top-0 z-40">
          {/* Equal side columns keep the nav centred on the page whatever the sides hold */}
          <div className="px-4 sm:px-6 lg:px-[7.5%] h-[72px] grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-4">
            <Link href="/invest" className="flex items-center gap-2 justify-self-start">
              <div className="bg-linear-to-br from-[#ff923e] to-[#c46018] p-2 rounded-xl">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-linear-to-r from-[#ff923e] to-[#c46018] bg-clip-text text-transparent">ASAP.</span>
            </Link>

            <nav aria-label="Owner panel" className="hidden md:flex items-center gap-1">
              {navItems.map((item) => navLink(item, false))}
            </nav>

            <div className="flex items-center gap-2 justify-self-end">
              <Link href="/invest/notifications"
                aria-label={unread.notifications > 0 ? `Notifications, ${unread.notifications} unread` : 'Notifications'}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition ${
                  pathname.startsWith('/invest/notifications') ? 'bg-inv-soft text-inv-text' : 'text-inv-muted hover:bg-inv-soft hover:text-inv-text'}`}>
                <Bell className="w-5 h-5" />
                {unread.notifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#ff923e] text-white text-[10px] font-semibold flex items-center justify-center">
                    {unread.notifications > 9 ? '9+' : unread.notifications}
                  </span>
                )}
              </Link>
              <Link href="/invest/settings" aria-label="Settings"
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  pathname.startsWith('/invest/settings') ? 'bg-inv-soft text-inv-text' : 'text-inv-muted hover:bg-inv-soft hover:text-inv-text'}`}>
                <Settings className="w-5 h-5" />
              </Link>
              <AvatarMenu
                userId={profile.userId}
                name={profile.name}
                photo={profile.photo}
                onPhoto={(photo) => setProfile({ ...profile, photo })}
                isVendor={profile.isVendor}
                dark={dark}
                onToggleTheme={toggleTheme}
                onChangePassword={() => setChangingPassword(true)}
                onSignOut={handleSignOut}
              />
            </div>
          </div>

          <nav aria-label="Owner panel" className="md:hidden flex gap-1 px-4 pb-3 overflow-x-auto">
            {navItems.map((item) => navLink(item, true))}
          </nav>
        </header>

        {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}

        <main className="px-4 sm:px-6 lg:px-[7.5%] py-8 sm:py-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </InvestContext.Provider>
  )
}
