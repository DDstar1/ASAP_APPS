'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Package, LayoutDashboard, ShoppingBag, Tag, ClipboardList,
  LogOut, Menu, X, Loader2, Store, User, Bot, ChevronDown, Plus,
} from 'lucide-react'
import { getSession, signOut, getVendorsByUserId } from '@/lib/supabase_queries'
import { useVendorStore, useVendor } from '@/store/vendorStore'
import type { VendorRow } from '@/lib/supabase'

export { useVendor }

const navItems = [
  { href: '/vendor/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/vendor/dashboard/items', label: 'Items', icon: ShoppingBag },
  { href: '/vendor/dashboard/categories', label: 'Categories', icon: Tag },
  { href: '/vendor/dashboard/orders', label: 'Orders', icon: ClipboardList },
  { href: '/vendor/dashboard/bot', label: 'Bot', icon: Bot },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { vendor, vendors, setVendor, setVendors, clearVendor } = useVendorStore()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [storeSwitcherOpen, setStoreSwitcherOpen] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await getSession()
      const user = session?.user
      if (!user) { router.replace('/login'); return }

      const { data: rows } = await getVendorsByUserId(user.id)
      const list = (rows ?? []) as VendorRow[]
      if (list.length === 0) { await signOut(); router.replace('/login'); return }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080e1c]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff923e]" />
      </div>
    )
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-[#0d1525]">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-linear-to-br from-[#ff923e] to-[#c46018] p-2 rounded-xl">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-linear-to-r from-[#ff923e] to-[#c46018] bg-clip-text text-transparent">ASAP.</span>
        </Link>
      </div>

      {/* Store switcher */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setStoreSwitcherOpen((o) => !o)}
          className="w-full flex items-center gap-3 px-2 py-3 bg-[#1c2a42] rounded-2xl hover:bg-[#253350] transition"
        >
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#ff923e] to-[#c46018] flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-semibold text-[#e0e5f9] truncate">{vendor?.name}</p>
            <p className="text-xs text-[#a5abbd] capitalize">{vendor?.acct_type}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-[#a5abbd] shrink-0 transition-transform ${storeSwitcherOpen ? 'rotate-180' : ''}`} />
        </button>

        {storeSwitcherOpen && (
          <div className="mt-2 bg-[#1c2a42] rounded-xl overflow-hidden border border-[#a5abbd]/10">
            {vendors.map((v) => (
              <button
                key={v.id}
                onClick={() => { setVendor(v); setStoreSwitcherOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition ${
                  vendor?.id === v.id
                    ? 'bg-[#ff923e]/10 text-[#ff923e]'
                    : 'text-[#a5abbd] hover:bg-[#253350] hover:text-[#e0e5f9]'
                }`}
              >
                <Store className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate font-medium">{v.name}</span>
                {vendor?.id === v.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ff923e]" />}
              </button>
            ))}
            <Link
              href="/become-vendor"
              onClick={() => setStoreSwitcherOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#a5abbd] hover:bg-[#253350] hover:text-[#e0e5f9] transition border-t border-[#a5abbd]/10"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              Add new store
            </Link>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-[#ff923e]/10 text-[#ff923e]' : 'text-[#a5abbd] hover:bg-[#1c2a42] hover:text-[#e0e5f9]'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ff923e]" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 space-y-1">
        <Link href="/home"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#a5abbd] hover:bg-[#1c2a42] hover:text-[#e0e5f9] transition-all w-full">
          <User className="w-4 h-4" />
          Switch to User View
        </Link>
        <button onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#a5abbd] hover:bg-red-500/10 hover:text-red-400 transition-all w-full">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-[#080e1c] flex">
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 z-10"><Sidebar /></div>
        </div>
      )}

      <div className="flex-1 lg:pl-64">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0d1525] sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-[#a5abbd] hover:bg-[#1c2a42] hover:text-[#e0e5f9]">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-[#e0e5f9]">{vendor?.name}</span>
          <button onClick={() => setSidebarOpen(false)} className="p-2 opacity-0 pointer-events-none">
            <X className="w-5 h-5" />
          </button>
        </div>
        <main className="p-6 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  )
}
