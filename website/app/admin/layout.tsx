'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Package, Loader2, LogOut, Moon, Sun, ShieldAlert } from 'lucide-react'
import { getSession, signOut } from '@/lib/supabase_queries'
import { RustError } from '@/lib/rust'
import { getMe, type Me, type Period } from '@/lib/admin'
import { AdminContext, type AdminSession } from '@/components/admin/AdminContext'

const THEME_KEY = 'asap-admin-theme'

const navItems = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/live', label: 'Live' },
  { href: '/admin/drivers', label: 'Drivers' },
  { href: '/admin/assets', label: 'Assets' },
  { href: '/admin/applications', label: 'Applications' },
  { href: '/admin/disputes', label: 'Disputes' },
  { href: '/admin/admins', label: 'Admins' },
]

type Gate =
  | { state: 'checking' }
  | { state: 'ok'; me: Me; email: string }
  | { state: 'denied'; email: string }
  | { state: 'error'; message: string }

// Rust's GET /admin/me is the gate: 200 shows the panel, 403 means signed in but not an admin.
// Rust checks back_admins again on every call, so this only decides what to show.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [gate, setGate] = useState<Gate>({ state: 'checking' })
  const [period, setPeriod] = useState<Period>({ preset: '7d' })
  const [dark, setDark] = useState(false)
  // Bumped by "Try again" to run the check once more
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const { data: { session } } = await getSession()
      if (cancelled) return
      if (!session) { router.replace('/login?next=/admin'); return }
      try { setDark(localStorage.getItem(THEME_KEY) === 'dark') } catch {}
      const email = session.user.email ?? ''
      try {
        const me = await getMe()
        if (!cancelled) setGate({ state: 'ok', me, email })
      } catch (e) {
        if (cancelled) return
        // A 401 here means Supabase says signed in but Rust didn't accept the token. Sending
        // the user to /login would bounce straight back (they are signed in), so show it.
        if (e instanceof RustError && e.status === 401) {
          setGate({ state: 'error', message: `The server didn't accept your sign-in (${e.message}). Sign out and in again; if it persists, the API's token check needs looking at.` })
        } else if (e instanceof RustError && e.status === 403) setGate({ state: 'denied', email })
        else setGate({ state: 'error', message: e instanceof Error ? e.message : 'Could not reach the server.' })
      }
    }
    check()
    return () => { cancelled = true }
  }, [router, attempt])

  const value = useMemo<AdminSession | null>(
    () => (gate.state === 'ok' ? { me: gate.me, email: gate.email, period, setPeriod } : null),
    [gate, period],
  )

  function toggleTheme() {
    setDark((d) => {
      try { localStorage.setItem(THEME_KEY, d ? 'light' : 'dark') } catch {}
      return !d
    })
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  const shell = (body: React.ReactNode) => (
    <div className="invest-theme min-h-dvh flex items-center justify-center p-6" data-theme={dark ? 'dark' : 'light'}>{body}</div>
  )

  if (gate.state === 'checking') return shell(<Loader2 className="w-8 h-8 animate-spin text-[#ff923e]" />)

  if (gate.state === 'denied' || gate.state === 'error') {
    return shell(
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-inv-soft flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-inv-muted" />
        </div>
        <h1 className="text-xl font-bold text-inv-text">{gate.state === 'denied' ? 'Admins only' : 'Something went wrong'}</h1>
        <p className="text-inv-muted mt-2">
          {gate.state === 'denied'
            ? `${gate.email} isn't an admin. Ask the superior admin to add you.`
            : gate.message}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {gate.state === 'error' && (
            <button onClick={() => { setGate({ state: 'checking' }); setAttempt((n) => n + 1) }} className="px-5 py-2.5 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white text-sm font-semibold cursor-pointer">
              Try again
            </button>
          )}
          <button onClick={handleSignOut} className="px-5 py-2.5 rounded-full border border-inv-line text-inv-text text-sm font-semibold cursor-pointer">
            Sign out
          </button>
        </div>
      </div>,
    )
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))
  const navLink = (item: (typeof navItems)[number]) => {
    const active = isActive(item.href)
    return (
      <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
        className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${active
          ? 'bg-linear-to-r from-[#ff923e] to-[#c46018] text-white shadow-[0_6px_16px_rgba(255,146,62,0.35)]'
          : 'text-inv-muted hover:text-inv-text hover:bg-inv-soft'}`}>
        {item.label}
      </Link>
    )
  }

  return (
    <AdminContext.Provider value={value}>
      <div className="invest-theme min-h-dvh" data-theme={dark ? 'dark' : 'light'}>
        <header className="inv-page-bg sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-[7.5%] h-[72px] grid grid-cols-[1fr_auto] xl:grid-cols-[1fr_auto_1fr] items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 justify-self-start">
              <div className="bg-linear-to-br from-[#ff923e] to-[#c46018] p-2 rounded-xl">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-linear-to-r from-[#ff923e] to-[#c46018] bg-clip-text text-transparent">ASAP.</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-inv-soft text-xs font-semibold text-inv-muted">Admin</span>
            </Link>

            <nav aria-label="Admin" className="hidden xl:flex items-center gap-1">{navItems.map(navLink)}</nav>

            <div className="flex items-center gap-2 justify-self-end">
              <div className="hidden sm:block text-right mr-1">
                <p className="text-sm font-medium text-inv-text leading-tight">{gate.email}</p>
                <p className="text-xs text-inv-muted capitalize">{gate.me.role}</p>
              </div>
              <button onClick={toggleTheme} aria-label={dark ? 'Light mode' : 'Dark mode'}
                className="w-10 h-10 rounded-full flex items-center justify-center text-inv-muted hover:bg-inv-soft hover:text-inv-text transition cursor-pointer">
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={handleSignOut} aria-label="Sign out"
                className="w-10 h-10 rounded-full flex items-center justify-center text-inv-muted hover:bg-red-500/10 hover:text-red-600 transition cursor-pointer">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav aria-label="Admin" className="xl:hidden flex gap-1 px-4 sm:px-6 pb-3 overflow-x-auto">{navItems.map(navLink)}</nav>
        </header>

        <main className="px-4 sm:px-6 lg:px-[7.5%] py-8 sm:py-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </AdminContext.Provider>
  )
}
