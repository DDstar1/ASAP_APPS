'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, LogOut, Loader2, Smartphone, Store, ClipboardList, Clock, CheckCircle, Truck } from 'lucide-react'
import { getSession, signOut, getVendorIdByEmail, getUserDeliveryOrders } from '@/lib/supabase_queries'
import type { User } from '@supabase/supabase-js'

type Order = {
  id: number
  status: string
  created_at: string
  pickup_name: string | null
  dropoff_name: string | null
}

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-yellow-400" />,
  arriving_pickup: <Truck className="w-4 h-4 text-blue-400" />,
  in_transit: <Truck className="w-4 h-4 text-[#ff923e]" />,
  delivered: <CheckCircle className="w-4 h-4 text-emerald-400" />,
}

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  arriving_pickup: 'Rider on the way',
  in_transit: 'In transit',
  delivered: 'Delivered',
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [isVendor, setIsVendor] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await getSession()
      const user = session?.user
      if (!user) { router.replace('/login'); return }
      setUser(user)

      const [{ data: ordersData }, { data: vendorData }] = await Promise.all([
        getUserDeliveryOrders(user.id),
        getVendorIdByEmail(user.email!),
      ])

      setOrders((ordersData as Order[]) ?? [])
      setIsVendor(!!vendorData)
      setLoading(false)
    }
    init()
  }, [router])

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080e1c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff923e]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080e1c]">
      <header className="sticky top-0 z-40 bg-[#0d1525] border-b border-[#a5abbd]/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-linear-to-br from-[#ff923e] to-[#c46018] p-1.5 rounded-lg">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-linear-to-r from-[#ff923e] to-[#c46018] bg-clip-text text-transparent">ASAP.</span>
          </Link>

          <div className="flex items-center gap-2">
            {isVendor ? (
              <Link href="/vendor/dashboard"
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#ff923e]/30 text-[#ff923e] text-sm font-medium hover:bg-[#ff923e]/10 transition">
                <Store className="w-4 h-4" /> Vendor Dashboard
              </Link>
            ) : (
              <Link href="/become-vendor"
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#ff923e]/30 text-[#ff923e] text-sm font-medium hover:bg-[#ff923e]/10 transition">
                <Store className="w-4 h-4" /> Become a Vendor
              </Link>
            )}
            <button onClick={handleSignOut} className="p-2 rounded-xl text-[#a5abbd] hover:text-red-400 hover:bg-red-500/10 transition" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[#e0e5f9]">Hey, {user?.email?.split('@')[0]} 👋</h1>
          <p className="text-[#a5abbd] mt-1">Here&apos;s your delivery history</p>
        </div>

        <div className="bg-linear-to-r from-[#ff923e] to-[#c46018] rounded-2xl p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-white font-bold text-lg">Want to send a package?</h2>
            <p className="text-white/80 text-sm mt-0.5">Download the ASAP app to create deliveries on the go.</p>
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-2 bg-[#080e1c] text-[#ff923e] px-4 py-2.5 rounded-full font-semibold text-sm">
              <Smartphone className="w-4 h-4" /> Get the App
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[#e0e5f9] mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#ff923e]" /> Your Deliveries
          </h2>

          {orders.length === 0 ? (
            <div className="bg-[#1c2a42] rounded-2xl p-10 text-center">
              <Package className="w-10 h-10 text-[#a5abbd]/40 mx-auto mb-3" />
              <p className="text-[#a5abbd]">No deliveries yet</p>
              <p className="text-sm text-[#a5abbd]/60 mt-1">Your orders will appear here once you use the app.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-[#1c2a42] rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#152035] flex items-center justify-center shrink-0">
                    {statusIcon[order.status] ?? <Package className="w-4 h-4 text-[#a5abbd]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#e0e5f9] truncate">
                      {order.pickup_name ?? 'Pickup'} → {order.dropoff_name ?? 'Dropoff'}
                    </p>
                    <p className="text-xs text-[#a5abbd] mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                    order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400'
                    : order.status === 'in_transit' ? 'bg-[#ff923e]/10 text-[#ff923e]'
                    : 'bg-[#a5abbd]/10 text-[#a5abbd]'
                  }`}>
                    {statusLabel[order.status] ?? order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
