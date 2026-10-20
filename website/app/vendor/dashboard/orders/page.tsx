'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ClipboardList, ChevronDown, Check, X, Phone, Clock, Bike, PackageCheck, Store, Loader2, Hourglass,
} from 'lucide-react'
// Zazu owns order status; the vendor only answers Accept / Can't fulfil
import { getVendorOrders, getCustomersByTelegramIds, respondToOrder } from '@/lib/supabase_queries'
import { useVendor } from '@/store/vendorStore'
import { itemsTotal } from '@/lib/supabase'
import type { OrderRow, CustomerRow } from '@/lib/supabase'

type OrderWithCustomer = OrderRow & { customer?: CustomerRow }
type Tab = 'accept' | 'active' | 'done'

const ACCEPT_WINDOW_MS = 48 * 3_600_000

const TABS: { value: Tab; label: string }[] = [
  { value: 'accept', label: 'To accept' },
  { value: 'active', label: 'In progress' },
  { value: 'done', label: 'Completed' },
]

const needsAnswer = (o: OrderRow) => o.status === 'paid' && !o.vendor_response
const tabOf = (o: OrderRow): Tab =>
  o.status === 'delivered' || o.status === 'cancelled' ? 'done'
    : o.status === 'pending' || needsAnswer(o) ? 'accept'
      : 'active'

function formatNaira(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

// eta is a timestamp or a ready-made label ("12 min"), whichever Zazu writes
function formatEta(eta: string) {
  const at = new Date(eta)
  return isNaN(at.getTime()) ? eta : at.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso: string, now: number) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
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
  if (!phone) return <span className="text-v-muted">No phone</span>
  return (
    <a href={`tel:${phone}`} className="inline-flex items-center gap-1 font-medium text-[#c46018] hover:underline">
      <Phone className="w-3.5 h-3.5" /> {phone}
    </a>
  )
}

function ItemsList({ order }: { order: OrderRow }) {
  return (
    <div className="space-y-1.5 text-sm">
      {order.items?.map((item, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span className="text-v-muted"><span className="font-semibold text-v-text">{item.quantity}×</span> {item.name}</span>
          <span className="text-v-text font-medium whitespace-nowrap tabular-nums">{formatNaira(item.price * item.quantity)}</span>
        </div>
      ))}
      <div className="flex justify-between pt-2 mt-2 border-t border-dashed border-v-line">
        <span className="font-semibold text-v-text">Items total</span>
        <span className="font-bold text-v-text tabular-nums">{formatNaira(itemsTotal(order))}</span>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <Orders />
    </Suspense>
  )
}

function Orders() {
  const { vendor } = useVendor()
  const router = useRouter()
  const params = useSearchParams()
  const [orders, setOrders] = useState<OrderWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState(0)
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
    setLoadedAt(Date.now())
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

  const counts = { accept: 0, active: 0, done: 0 } as Record<Tab, number>
  for (const o of orders) counts[tabOf(o)]++
  const requested = params.get('tab') as Tab | null
  const tab: Tab = requested && TABS.some((t) => t.value === requested) ? requested
    : counts.accept > 0 ? 'accept' : 'active'
  const tabIndex = TABS.findIndex((t) => t.value === tab)
  const inTab = orders.filter((o) => tabOf(o) === tab)

  const actions = (order: OrderWithCustomer, size: 'lg' | 'sm') => (
    <>
      {respondError?.id === order.id && <p className="text-sm text-v-down mb-2">{respondError.message}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {needsAnswer(order) && (
          <button disabled={respondingId === order.id} onClick={() => handleRespond(order.id, true)}
            className={`inline-flex items-center gap-2 rounded-full font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer ${
              size === 'lg' ? 'px-6 py-3' : 'px-4 py-2 text-sm'}`}>
            {respondingId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Accept order
          </button>
        )}
        <button disabled={respondingId === order.id} onClick={() => handleRespond(order.id, false)}
          className={`inline-flex items-center gap-2 rounded-full font-semibold border border-v-down/40 text-v-down hover:bg-v-down/10 transition disabled:opacity-50 cursor-pointer ${
            size === 'lg' ? 'px-6 py-3' : 'px-4 py-2 text-sm'}`}>
          <X className="w-4 h-4" /> Can&apos;t fulfil
        </button>
      </div>
    </>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-v-text tracking-tight">Orders</h1>
          <p className="text-v-muted mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} in total</p>
        </div>
        <div role="tablist" aria-label="Order stage" className="relative grid grid-cols-3 bg-v-card rounded-full p-1 w-full sm:w-auto sm:min-w-[400px]">
          <span aria-hidden className="absolute top-1 bottom-1 left-1 rounded-full bg-v-text transition-transform duration-300 ease-out"
            style={{ width: 'calc((100% - 8px) / 3)', transform: `translateX(${tabIndex * 100}%)` }} />
          {TABS.map(({ value, label }) => (
            <button key={value} role="tab" aria-selected={tab === value}
              onClick={() => router.replace(`/vendor/dashboard/orders?tab=${value}`, { scroll: false })}
              className={`relative z-10 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                tab === value ? 'text-v-surface' : 'text-v-muted hover:text-v-text'}`}>
              {label}
              {counts[value] > 0 && (
                <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center ${
                  value === 'accept' ? 'bg-[#ff923e] text-white' : tab === value ? 'bg-v-surface/20' : 'bg-v-raised'}`}>
                  {counts[value]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-v-card rounded-3xl animate-pulse" />)}
        </div>
      ) : inTab.length === 0 ? (
        <div className="text-center py-20 animate-rise">
          <div className="w-16 h-16 bg-v-card rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-v-muted/50" />
          </div>
          <p className="text-v-text font-semibold">
            {tab === 'accept' ? 'Nothing waiting for you' : tab === 'active' ? 'No orders on the way' : 'No completed orders yet'}
          </p>
          <p className="text-sm text-v-muted mt-1">
            {tab === 'accept' ? 'New paid orders show up here for you to accept.' : 'Orders move here as they progress.'}
          </p>
        </div>
      ) : tab === 'accept' ? (
        <div className="space-y-4">
          {inTab.filter(needsAnswer).map((order, i) => {
            const left = new Date(order.created_at).getTime() + ACCEPT_WINDOW_MS - loadedAt
            const hours = Math.max(0, Math.floor(left / 3_600_000))
            const urgent = left < 6 * 3_600_000
            return (
              <article key={order.id} className="relative rounded-3xl bg-v-surface border border-v-line overflow-hidden shadow-[0_8px_28px_rgba(13,21,37,0.06)] animate-rise"
                style={{ animationDelay: `${i * 60}ms` }}>
                <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-b from-[#ff923e] to-[#c46018]" />
                <div className="p-6 pl-8 grid md:grid-cols-[1fr_auto] gap-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <h2 className="text-xl font-bold text-v-text">Order #{order.id}</h2>
                      <span className="text-sm text-v-muted">· {timeAgo(order.created_at, loadedAt)}</span>
                      <span className={`ml-auto md:ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        urgent ? 'bg-v-down/10 text-v-down' : 'bg-[var(--v-butter-bg)] text-v-warn'}`}>
                        <Clock className="w-3.5 h-3.5" /> {hours}h left to accept
                      </span>
                    </div>
                    <ItemsList order={order} />
                    <p className="text-sm text-v-muted mt-4">
                      For <span className="font-medium text-v-text">{order.customer?.name ?? 'a Telegram customer'}</span>
                      {(order.customer_phone ?? order.customer?.phone) && <> · <PhoneLink phone={order.customer_phone ?? order.customer?.phone} /></>}
                    </p>
                  </div>
                  <div className="flex md:flex-col md:items-stretch md:justify-center gap-2 md:border-l md:border-dashed md:border-v-line md:pl-6">
                    {actions(order, 'lg')}
                  </div>
                </div>
              </article>
            )
          })}

          {inTab.some((o) => o.status === 'pending') && (
            <div className="pt-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-v-muted mb-3">
                <Hourglass className="w-4 h-4" /> Waiting for the customer to pay
              </p>
              <div className="space-y-2">
                {inTab.filter((o) => o.status === 'pending').map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-4 rounded-2xl bg-v-card px-5 py-3.5 text-sm opacity-80">
                    <span className="font-semibold text-v-text">#{order.id}</span>
                    <span className="text-v-muted truncate flex-1">{order.items?.map((it) => `${it.quantity}× ${it.name}`).join(', ')}</span>
                    <span className="font-semibold text-v-text tabular-nums">{formatNaira(itemsTotal(order))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : tab === 'active' ? (
        <div className="space-y-4">
          {inTab.map((order, i) => {
            const hasRider = !!(order.driver_name || order.driver_phone)
            const pickedUp = !!order.pickup_confirmed_at
            const steps = [
              { label: 'Accepted', icon: Store, done: true },
              { label: 'Rider assigned', icon: Bike, done: hasRider },
              { label: 'Picked up', icon: PackageCheck, done: pickedUp },
              { label: 'Delivered', icon: Check, done: false },
            ]
            const reached = steps.filter((s) => s.done).length
            const open = expandedId === order.id
            return (
              <article key={order.id} className="rounded-3xl bg-v-surface border border-v-line p-6 animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold text-v-text">Order #{order.id}</h2>
                  <span className="text-lg font-bold text-v-text tabular-nums">{formatNaira(itemsTotal(order))}</span>
                </div>
                <p className="text-sm text-v-muted mt-0.5">
                  {order.customer?.name ?? 'Telegram customer'} · {timeAgo(order.created_at, loadedAt)}
                </p>

                <ol className="relative grid grid-cols-4 mt-6" aria-label={`Progress: ${steps[reached - 1].label}`}>
                  <span aria-hidden className="absolute top-4 left-[12.5%] right-[12.5%] h-1 rounded-full bg-v-raised" />
                  <span aria-hidden className="absolute top-4 left-[12.5%] h-1 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] transition-all duration-700"
                    style={{ width: `${((reached - 1) / 3) * 75}%` }} />
                  {steps.map(({ label, icon: Icon, done }, s) => (
                    <li key={label} className="relative flex flex-col items-center gap-2 text-center">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center ring-4 ring-v-surface ${
                        done ? 'bg-[#ff923e] text-white' : 'bg-v-raised text-v-muted'} ${s === reached ? 'animate-pulse' : ''}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className={`text-xs font-medium ${done ? 'text-v-text' : 'text-v-muted'}`}>{label}</span>
                    </li>
                  ))}
                </ol>

                <div className="grid sm:grid-cols-2 gap-3 mt-6">
                  <div className="rounded-2xl bg-v-card p-4 text-sm">
                    <p className="text-xs font-semibold text-v-muted uppercase tracking-wider mb-1.5">Rider</p>
                    {hasRider ? (
                      <>
                        <p className="font-semibold text-v-text">{order.driver_name}</p>
                        <PhoneLink phone={order.driver_phone} />
                        {order.eta && <p className="text-v-muted mt-1">ETA {formatEta(order.eta)}</p>}
                      </>
                    ) : (
                      <p className="text-v-muted">Finding a rider…</p>
                    )}
                  </div>
                  {order.pickup_code && !pickedUp ? (
                    <div className="rounded-2xl bg-[var(--v-peach-bg)] p-4">
                      <p className="text-xs font-semibold text-v-muted uppercase tracking-wider mb-1">Pickup code</p>
                      <p className="font-mono text-3xl font-bold tracking-[0.3em]" style={{ color: 'var(--v-peach-ink)' }}>{order.pickup_code}</p>
                      <p className="text-xs text-v-muted mt-1">Check it matches the rider&apos;s before handing over</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-v-card p-4 text-sm">
                      <p className="text-xs font-semibold text-v-muted uppercase tracking-wider mb-1.5">Customer</p>
                      <p className="font-semibold text-v-text">{order.customer?.name ?? 'Telegram customer'}</p>
                      <PhoneLink phone={order.customer_phone ?? order.customer?.phone} />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
                  <button onClick={() => setExpandedId(open ? null : order.id)} aria-expanded={open}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-v-muted hover:text-v-text cursor-pointer">
                    {order.items?.length ?? 0} item{order.items?.length === 1 ? '' : 's'}
                    <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {!pickedUp && actions(order, 'sm')}
                </div>
                {open && <div className="mt-4 rounded-2xl bg-v-card p-4"><ItemsList order={order} /></div>}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-v-line overflow-hidden">
          {inTab.map((order, i) => {
            const open = expandedId === order.id
            const delivered = order.status === 'delivered'
            return (
              <div key={order.id} className="border-b border-v-line last:border-0 animate-rise" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                <button onClick={() => setExpandedId(open ? null : order.id)} aria-expanded={open}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-v-card transition-colors cursor-pointer">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    delivered ? 'bg-v-up/10 text-v-up' : 'bg-v-down/10 text-v-down'}`}>
                    {delivered ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-v-text">
                      #{order.id} <span className={`ml-1.5 text-xs font-medium ${delivered ? 'text-v-up' : 'text-v-down'}`}>
                        {delivered ? 'Delivered' : 'Cancelled'}
                      </span>
                    </span>
                    <span className="block text-xs text-v-muted truncate">
                      {order.customer?.name ?? 'Telegram customer'} · {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${delivered ? 'text-v-text' : 'text-v-muted line-through'}`}>
                    {formatNaira(itemsTotal(order))}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-v-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="px-5 pb-5 pl-[4.25rem] space-y-4">
                    <ItemsList order={order} />
                    {order.status === 'cancelled' && order.cancel_reason && (
                      <div className="rounded-xl bg-v-down/10 p-3 text-sm">
                        <p className="text-v-down font-medium">{cancelReasons[order.cancel_reason]}</p>
                        {order.refund_status && <p className="text-v-muted mt-0.5">{refundLabels[order.refund_status]}</p>}
                      </div>
                    )}
                    {delivered && order.driver_name && (
                      <p className="text-sm text-v-muted">Delivered by <span className="font-medium text-v-text">{order.driver_name}</span></p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
