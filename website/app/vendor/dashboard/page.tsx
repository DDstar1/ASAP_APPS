'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, ClipboardList, DollarSign, TrendingUp, Clock, CheckCircle, XCircle, PackageCheck } from 'lucide-react'
import { supabase, type OrderRow } from '@/lib/supabase'
import { useVendor } from './layout'

type Stats = {
  totalOrders: number
  pendingOrders: number
  inProgressOrders: number
  deliveredOrders: number
  totalRevenue: number
  totalItems: number
}

const statusColors: Record<OrderRow['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
        supabase.from('telegram_orders').select('*').eq('vendor_id', vendor!.id).order('created_at', { ascending: false }),
        supabase.from('telegram_vendor_item').select('id').eq('vendor_id', vendor!.id),
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
        { label: 'Total Orders', value: stats.totalOrders, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Pending', value: stats.pendingOrders, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
        { label: 'In Progress', value: stats.inProgressOrders, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        { label: 'Delivered', value: stats.deliveredOrders, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        { label: 'Total Items', value: stats.totalItems, icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        { label: 'Revenue', value: formatNaira(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
      ]
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {vendor?.name}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-gray-800/50 rounded-2xl animate-pulse border border-gray-200 dark:border-gray-700" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Recent orders */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
            </div>
            {recentOrders.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No orders yet</div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentOrders.map((order) => (
                  <div key={order.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Order #{order.id}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatNaira(order.total)}</span>
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
