'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Package, LayoutDashboard, ShoppingBag, Tag, ClipboardList, LogOut, Menu, X, Loader2, Store } from 'lucide-react'
import { supabase, type VendorRow } from '@/lib/supabase'

type VendorContext = { vendor: VendorRow | null }
const VendorCtx = createContext<VendorContext>({ vendor: null })
export const useVendor = () => useContext(VendorCtx)

const navItems = [
  { href: '/vendor/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/vendor/dashboard/items', label: 'Items', icon: ShoppingBag },
  { href: '/vendor/dashboard/categories', label: 'Categories', icon: Tag },
  { href: '/vendor/dashboard/orders', label: 'Orders', icon: ClipboardList },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [vendor, setVendor] = useState<VendorRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/vendor/login'); return }

      const { data: v } = await supabase
        .from('telegram_vendor')
        .select('*')
        .eq('email', user.email)
        .single()

      if (!v) { await supabase.auth.signOut(); router.replace('/vendor/login'); return }
      setVendor(v)
      setLoading(false)
    }
    init()
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/vendor/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ASAP.
          </span>
        </Link>
      </div>

      {/* Vendor info */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{vendor?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{vendor?.acct_type}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <VendorCtx.Provider value={{ vendor }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
          <Sidebar />
        </div>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-64 z-10">
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 lg:pl-64">
          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{vendor?.name}</span>
            <button onClick={() => setSidebarOpen(false)} className="p-2 opacity-0 pointer-events-none">
              <X className="w-5 h-5" />
            </button>
          </div>

          <main className="p-6 max-w-7xl mx-auto">{children}</main>
        </div>
      </div>
    </VendorCtx.Provider>
  )
}
