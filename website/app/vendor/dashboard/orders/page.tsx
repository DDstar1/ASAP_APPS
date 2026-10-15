'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, ChevronDown, Filter } from 'lucide-react'
// Zazu owns order status; the vendor only answers Accept / Can't fulfil
import { getVendorOrders, getCustomersByTelegramIds, respondToOrder } from '@/lib/supabase_queries'
import { useVendor } from '@/store/vendorStore'
import { itemsTotal } from '@/lib/supabase'
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

// eta is a timestamp or a ready-made label ("12 min"), whichever Zazu writes
function formatEta(eta: string) {
  const at = new Date(eta)
  return isNaN(at.getTime()) ? eta : at.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

const cancelReasons: Record<NonNullable<OrderRow['cancel_reason']>, string> = {
  vendor_declined: 'You marked this order as one you can\'t fulfil',
  vendor_no_response: 'Not accepted within 48 hours',
  pickup_timeout: 'Not picked up within 1 hour of a rider being assigned',
}

const refundLabels: Record<NonNullable<OrderRow['refund_status']>, string> = {
  pending: 'Customer refund in progress',
  refunded: 'Customer refunded',
  failed: 'Customer refund failed, ASAP support is on it',
}

function PhoneLink({ phone }: { phone: string | null | undefined }) {
  if (!phone) return <p className="text-[#a5abbd]">No phone</p>
  return <a href={`tel:${phone}`} className="text-[#ff923e] hover:underline">{phone}</a>
}

export default function OrdersPage() {
  const { vendor } = useVendor()
  const [orders, setOrders] = useState<OrderWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderRow['status'] | 'all'>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [respondingId, setRespondingId] = useState<number | null>(null)
  const [respondError, setRespondError] = useState<{ id: number; message: string } | null>(null)

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

  async function handleRespond(orderId: number, accept: boolean) {
    if (!accept && !window.confirm(`Cancel order #${orderId}? The customer will be refunded. This can't be undone.`)) return
    setRespondingId(orderId)
    setRespondError(null)
    const { error } = await respondToOrder(orderId, accept)
    if (error) {
      setRespondError({
        id: orderId,
        message: error.code === 'P0001' ? 'This order can no longer be changed.' : 'Something went wrong. Try again.',
      })
    }
    // Reload either way: on P0001 the order has moved on (e.g. timed out)
    await load()
    setRespondingId(null)
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
                  <span className="text-sm font-bold text-[#e0e5f9]">{formatNaira(itemsTotal(order))}</span>
                  <ChevronDown className={`w-4 h-4 text-[#a5abbd] transition-transform ${expandedId === order.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {expandedId === order.id && (
                <div className="bg-[#152035] px-5 py-4">
                  <div className="space-y-2 text-sm mb-4">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between gap-4">
                        <span className="text-[#a5abbd]">{item.quantity} × {item.name}</span>
                        <span className="text-[#e0e5f9] font-medium whitespace-nowrap">{formatNaira(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 mt-2" style={{ borderTop: '1px solid rgba(165,171,189,0.1)' }}>
                      <span className="font-semibold text-[#e0e5f9]">Items total</span>
                      <span className="font-bold text-[#e0e5f9]">{formatNaira(itemsTotal(order))}</span>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div className="bg-[#1c2a42] rounded-xl p-3 text-sm">
                      <p className="font-medium text-[#a5abbd] mb-1">Customer</p>
                      <p className="text-[#e0e5f9]">{order.customer?.name ?? 'Telegram customer'}</p>
                      <PhoneLink phone={order.customer_phone ?? order.customer?.phone} />
                    </div>
                    <div className="bg-[#1c2a42] rounded-xl p-3 text-sm">
                      <p className="font-medium text-[#a5abbd] mb-1">Rider</p>
                      {order.driver_name || order.driver_phone ? (
                        <>
                          <p className="text-[#e0e5f9]">{order.driver_name}</p>
                          <PhoneLink phone={order.driver_phone} />
                          {order.pickup_code && <p className="text-[#a5abbd] mt-1">Pickup code <span className="font-mono font-semibold text-[#ff923e]">{order.pickup_code}</span></p>}
                          {order.eta && <p className="text-[#a5abbd]">ETA {formatEta(order.eta)}</p>}
                        </>
                      ) : (
                        <p className="text-[#a5abbd]">No rider assigned yet</p>
                      )}
                    </div>
                  </div>

                  {order.status === 'cancelled' && order.cancel_reason && (
                    <div className="bg-red-500/10 rounded-xl p-3 text-sm mb-4">
                      <p className="text-red-400">{cancelReasons[order.cancel_reason]}</p>
                      {order.refund_status && <p className="text-[#a5abbd] mt-0.5">{refundLabels[order.refund_status]}</p>}
                    </div>
                  )}

                  {respondError?.id === order.id && (
                    <p className="text-sm text-red-400 mb-2">{respondError.message}</p>
                  )}

                  {(order.status === 'paid' || order.status === 'in_progress') && !order.pickup_confirmed_at && (
                    <div className="flex flex-wrap items-center gap-2">
                      {order.status === 'paid' && !order.vendor_response && (
                        <button disabled={respondingId === order.id} onClick={() => handleRespond(order.id, true)}
                          className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition disabled:opacity-40">
                          Accept order
                        </button>
                      )}
                      <button disabled={respondingId === order.id} onClick={() => handleRespond(order.id, false)}
                        className="px-4 py-2 rounded-full text-sm font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition disabled:opacity-40">
                        Can&apos;t fulfil
                      </button>
                      {order.status === 'paid' && !order.vendor_response && (
                        <span className="text-xs text-[#a5abbd]">Orders not accepted within 48 hours are cancelled and refunded</span>
                      )}
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
