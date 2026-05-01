'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, ClipboardList, DollarSign, TrendingUp, Clock, CheckCircle, PackageCheck } from 'lucide-react'
import { getVendorOrders, getVendorItemIds } from '@/lib/supabase_queries'
import { useVendor } from '@/store/vendorStore'
import type { OrderRow } from '@/lib/supabase'

type Stats = {
  totalOrders: number
  pendingOrders: number
  inProgressOrders: number
  deliveredOrders: number
  totalRevenue: number
  totalItems: number
}

const statusColors: Record<OrderRow['status'], string> = {
  pending: 'bg-yellow-500/15 text-yellow-400',
  paid: 'bg-[#ff923e]/15 text-[#ff923e]',
  in_progress: 'bg-violet-500/15 text-violet-400',
  delivered: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-red-500/15 text-red-400',
}

function formatNaira(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

export default function DashboardPage() {
  const { vendor } = useVendor()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!vendor) return
    async function load() {
      const [ordersRes, itemsRes] = await Promise.all([
        getVendorOrders(vendor!.id),
        getVendorItemIds(vendor!.id),
      ])

      const orders: OrderRow[] = ordersRes.data || []
      setRecentOrders(orders.slice(0, 5))
      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === 'pending').length,
        inProgressOrders: orders.filter((o) => o.status === 'in_progress').length,
        deliveredOrders: orders.filter((o) => o.status === 'delivered').length,
        totalRevenue: orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total, 0),
        totalItems: (itemsRes.data || []).length,
      })
      setLoading(false)
    }
    load()
  }, [vendor])

  const statCards = stats
    ? [
        { label: 'Total Orders', value: stats.totalOrders, icon: ClipboardList, color: 'text-[#ff923e]', bg: 'bg-[#ff923e]/10' },
        { label: 'Pending', value: stats.pendingOrders, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        { label: 'In Progress', value: stats.inProgressOrders, icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        { label: 'Delivered', value: stats.deliveredOrders, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Total Items', value: stats.totalItems, icon: ShoppingBag, color: 'text-sky-400', bg: 'bg-sky-500/10' },
        { label: 'Revenue', value: formatNaira(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
      ]
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#e0e5f9]">Overview</h1>
        <p className="text-[#a5abbd] mt-1">Welcome back, {vendor?.name}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#1c2a42] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-[#152035] rounded-2xl p-5">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="text-2xl font-bold text-[#e0e5f9]">{value}</div>
                <div className="text-sm text-[#a5abbd] mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#152035] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-[#a5abbd]" />
              <h2 className="font-semibold text-[#e0e5f9]">Recent Orders</h2>
            </div>
            {recentOrders.length === 0 ? (
              <div className="px-6 py-12 text-center text-[#a5abbd]">No orders yet</div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {recentOrders.map((order) => (
                  <div key={order.id} className="px-6 py-4 flex items-center justify-between bg-[#0d1525]">
                    <div>
                      <p className="text-sm font-medium text-[#e0e5f9]">Order #{order.id}</p>
                      <p className="text-xs text-[#a5abbd] mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-[#e0e5f9]">{formatNaira(order.total)}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
