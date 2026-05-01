'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, ChevronDown, Filter } from 'lucide-react'
import { getVendorOrders, updateOrderStatus, getCustomersByTelegramIds } from '@/lib/supabase_queries'
import { useVendor } from '@/store/vendorStore'
import type { OrderRow, CustomerRow } from '@/lib/supabase'

type OrderWithCustomer = OrderRow & { customer?: CustomerRow }

const STATUS_OPTIONS: OrderRow['status'][] = ['pending', 'paid', 'in_progress', 'delivered', 'cancelled']

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

export default function OrdersPage() {
  const { vendor } = useVendor()
  const [orders, setOrders] = useState<OrderWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderRow['status'] | 'all'>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    if (!vendor) return
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor])

  async function load() {
    const { data: ordersData } = await getVendorOrders(vendor!.id)
    if (!ordersData) { setLoading(false); return }

    const userIds = [...new Set(ordersData.map((o) => o.user_id).filter(Boolean))] as number[]
    let customers: CustomerRow[] = []
    if (userIds.length) {
      const { data } = await getCustomersByTelegramIds(userIds)
      customers = data || []
    }

    setOrders(ordersData.map((order) => ({
      ...order,
      customer: customers.find((c) => c.telegram_user_id === order.user_id),
    })))
    setLoading(false)
  }

  async function handleUpdateStatus(orderId: number, status: OrderRow['status']) {
    setUpdatingId(orderId)
    const { error } = await updateOrderStatus(orderId, status)
    if (!error) setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
    setUpdatingId(null)
  }

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)
  const counts = STATUS_OPTIONS.reduce((acc, s) => { acc[s] = orders.filter((o) => o.status === s).length; return acc }, {} as Record<OrderRow['status'], number>)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#e0e5f9]">Orders</h1>
        <p className="text-[#a5abbd] mt-0.5 text-sm">{orders.length} total order{orders.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${filter === 'all' ? 'bg-[#ff923e] text-white' : 'bg-[#152035] text-[#a5abbd] hover:bg-[#1c2a42] hover:text-[#e0e5f9]'}`}>
          <Filter className="w-3.5 h-3.5" /> All <span className="text-xs opacity-70">{orders.length}</span>
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${filter === s ? 'bg-[#ff923e] text-white' : 'bg-[#152035] text-[#a5abbd] hover:bg-[#1c2a42] hover:text-[#e0e5f9]'}`}>
            {s.replace('_', ' ')} <span className="text-xs opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-[#152035] rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[#1c2a42] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-[#a5abbd]/40" />
          </div>
          <p className="text-[#a5abbd] font-medium">No {filter !== 'all' ? filter.replace('_', ' ') + ' ' : ''}orders</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {filtered.map((order) => (
            <div key={order.id} className="bg-[#0d1525] rounded-2xl overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#111a2e] transition">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-[#e0e5f9]">Order #{order.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>{order.status.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#a5abbd]">
                      {order.customer && <span>{order.customer.name}</span>}
                      <span>{new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#e0e5f9]">{formatNaira(order.total)}</span>
                  <ChevronDown className={`w-4 h-4 text-[#a5abbd] transition-transform ${expandedId === order.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expandedId === order.id && (
                <div className="bg-[#152035] px-5 py-4">
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-[#a5abbd]">Subtotal</span><span className="text-[#e0e5f9] font-medium">{formatNaira(order.subtotal)}</span></div>
                      <div className="flex justify-between"><span className="text-[#a5abbd]">Delivery Fee</span><span className="text-[#e0e5f9] font-medium">{formatNaira(order.delivery_fee)}</span></div>
                      <div className="flex justify-between pt-2 mt-2" style={{ borderTop: '1px solid rgba(165,171,189,0.1)' }}>
                        <span className="font-semibold text-[#e0e5f9]">Total</span>
                        <span className="font-bold text-[#e0e5f9]">{formatNaira(order.total)}</span>
                      </div>
                    </div>
                    {order.customer && (
                      <div className="bg-[#1c2a42] rounded-xl p-3 text-sm">
                        <p className="font-medium text-[#a5abbd] mb-1">Customer</p>
                        <p className="text-[#e0e5f9]">{order.customer.name}</p>
                        <p className="text-[#a5abbd]">{order.customer.phone}</p>
                      </div>
                    )}
                  </div>
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <div>
                      <p className="text-xs font-medium text-[#a5abbd] mb-2">Update Status</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.filter((s) => s !== order.status && s !== 'pending').map((s) => (
                          <button key={s} disabled={updatingId === order.id} onClick={() => handleUpdateStatus(order.id, s)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${statusColors[s]} opacity-80 hover:opacity-100 disabled:opacity-40`}>
                            Mark {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
