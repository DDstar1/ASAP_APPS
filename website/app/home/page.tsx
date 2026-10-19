'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, LogOut, Loader2, Smartphone, Store, ClipboardList, Clock, CheckCircle, Truck, Bike, Phone, XCircle } from 'lucide-react'
import { getSession, signOut, getVendorsByUserId, getUserDeliveryOrders, getMyAccess } from '@/lib/supabase_queries'
import { getMyApplication, type DriverApplication } from '@/lib/driverApplications'
import DriverApplicationSheet from '@/components/DriverApplicationSheet'
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
  const [isDriver, setIsDriver] = useState(false)
  const [application, setApplication] = useState<DriverApplication | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await getSession()
      const user = session?.user
      if (!user) { router.replace('/login'); return }
      setUser(user)

      const [{ data: ordersData }, { data: vendorData }, { data: access }, { data: app }] = await Promise.all([
        getUserDeliveryOrders(user.id),
        getVendorsByUserId(user.id),
        getMyAccess(),
        getMyApplication(user.id),
      ])

      setOrders((ordersData as Order[]) ?? [])
      setIsVendor(!!vendorData && vendorData.length > 0)
      setIsDriver(!!access?.driver)
      setApplication((app as DriverApplication | null) ?? null)
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
            <Link href="/invest"
              className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#ff923e]/30 text-[#ff923e] text-sm font-medium hover:bg-[#ff923e]/10 transition">
              <Bike className="w-4 h-4" /> Invest
            </Link>
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

        {!isDriver && <DriverCard application={application} onApply={() => setApplying(true)} />}

        {applying && (
          <DriverApplicationSheet onClose={() => setApplying(false)} onSubmitted={setApplication} />
        )}

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

function DriverCard({ application, onApply }: { application: DriverApplication | null; onApply: () => void }) {
  const open = application && (application.status === 'submitted' || application.status === 'contacted')

  if (open || application?.status === 'approved') {
    const view = application!.status === 'approved'
      ? { icon: CheckCircle, tone: 'bg-emerald-500/15 text-emerald-400', title: 'You’re approved to ride',
          body: 'Download the ASAP Rider app and sign in with this account to start.' }
      : application!.status === 'contacted'
        ? { icon: Phone, tone: 'bg-sky-500/15 text-sky-400', title: 'We’ve reached out',
            body: 'Check your phone and email to book your in-person visit.' }
        : { icon: Clock, tone: 'bg-yellow-500/15 text-yellow-400', title: 'Application received',
            body: 'The ASAP team will call or email you to book an in-person visit.' }
    return (
      <div className="bg-[#1c2a42] rounded-2xl p-6 flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${view.tone}`}>
          <view.icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-[#e0e5f9] font-bold">{view.title}</h2>
          <p className="text-[#a5abbd] text-sm mt-0.5">{view.body}</p>
        </div>
        {application!.status === 'approved' && (
          <Link href="/become-driver" className="shrink-0 px-4 py-2 rounded-full bg-[#ff923e] text-white text-sm font-semibold">
            Get the app
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="bg-[#1c2a42] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#ff923e]/15 text-[#ff923e] flex items-center justify-center shrink-0">
          {application?.status === 'rejected' ? <XCircle className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
        </div>
        <div>
          <h2 className="text-[#e0e5f9] font-bold">
            {application?.status === 'rejected' ? 'Your last application wasn’t approved' : 'Become a driver'}
          </h2>
          <p className="text-[#a5abbd] text-sm mt-0.5">Earn on ASAP deliveries. No bike? Apply to ride one of ours.</p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link href="/become-driver"
          className="px-4 py-2.5 rounded-full border border-[#a5abbd]/20 text-[#e0e5f9] text-sm font-medium hover:bg-[#253350] transition">
          I have a bike
        </Link>
        <button onClick={onApply}
          className="px-4 py-2.5 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white text-sm font-semibold cursor-pointer">
          {application?.status === 'rejected' ? 'Apply again' : 'Ride an ASAP bike'}
        </button>
      </div>
    </div>
  )
}
