'use client'

import { useEffect, useState } from 'react'
import {
  ShoppingBag, ClipboardList, DollarSign, TrendingUp, Clock, CheckCircle, PackageCheck, AlertTriangle, Users, UserPlus,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import { STRIKE_LIMIT } from '@/lib/vendorGuidelines'
import {
  getVendorOrders, getVendorItemIds, getVendorStrikes, getVendorCustomerStats,
  type CustomerStats, type StatsPeriod,
} from '@/lib/supabase_queries'
import { useVendor } from '@/store/vendorStore'
import { itemsTotal } from '@/lib/supabase'
import type { OrderRow } from '@/lib/supabase'

type Data = {
  vendorId: number
  orders: OrderRow[]
  totalItems: number
  strikes: number
  customers: CustomerStats | null
}

// One filter for the whole Overview. Pending and In Progress are live
// counts; Total Items and Strikes aren't tied to a period.
// Each period is compared with the one just before it (all time has none).
const PERIODS: { value: StatsPeriod; label: string; hint: string; vs: string; days: number | null }[] = [
  { value: 'day', label: 'Day', hint: 'Last 24 hours', vs: 'vs previous 24 hours', days: 1 },
  { value: 'week', label: 'Week', hint: 'Last 7 days', vs: 'vs previous 7 days', days: 7 },
  { value: 'month', label: 'Month', hint: 'Last 30 days', vs: 'vs previous 30 days', days: 30 },
  { value: 'year', label: 'Year', hint: 'Last 365 days', vs: 'vs previous 365 days', days: 365 },
  { value: 'all', label: 'All time', hint: 'All time', vs: '', days: null },
]

type Change = { now: number; prev: number; format?: (n: number) => string }

// "▲ 12% · +3 vs previous 7 days". No % when the previous period was 0.
function ChangeLine({ change, vs }: { change: Change; vs: string }) {
  const diff = change.now - change.prev
  const fmt = change.format ?? ((n: number) => n.toLocaleString('en-NG'))
  const pct = change.prev > 0 ? Math.round((diff / change.prev) * 100) : null
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus
  const color = diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-[#a5abbd]/70'
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  return (
    <div className="flex flex-wrap items-center gap-x-1 text-xs mt-1.5">
      <span className={`inline-flex items-center gap-0.5 font-medium tabular-nums ${color}`}>
        <Icon className="w-3.5 h-3.5" aria-hidden />
        {pct !== null && <>{Math.abs(pct)}% · </>}
        {sign}{fmt(Math.abs(diff))}
      </span>
      <span className="text-[#a5abbd]/60">{vs}</span>
    </div>
  )
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
  const [data, setData] = useState<Data | null>(null)
  const [period, setPeriod] = useState<StatsPeriod>('all')
  // Fixed per load, so filtering stays pure during render
  const [loadedAt, setLoadedAt] = useState(0)

  useEffect(() => {
    if (!vendor) return
    let cancelled = false
    Promise.all([
      getVendorOrders(vendor.id),
      getVendorItemIds(vendor.id),
      getVendorStrikes(vendor.id),
      getVendorCustomerStats(vendor.id),
    ]).then(([ordersRes, itemsRes, strikesRes, customersRes]) => {
      if (cancelled) return
      setLoadedAt(Date.now())
      setData({
        vendorId: vendor.id,
        orders: (ordersRes.data || []) as OrderRow[],
        totalItems: (itemsRes.data || []).length,
        strikes: typeof strikesRes.data === 'number' ? strikesRes.data : 0,
        customers: customersRes.data,
      })
    })
    return () => { cancelled = true }
  }, [vendor])

  const loading = !vendor || data?.vendorId !== vendor.id
  const current = PERIODS.find((p) => p.value === period)!

  const statCards = data && !loading
    ? (() => {
        const span = current.days === null ? null : current.days * 86_400_000
        const between = (from: number, to: number) =>
          data.orders.filter((o) => { const t = new Date(o.created_at).getTime(); return t > from && t <= to })
        const inPeriod = span === null ? data.orders : between(loadedAt - span, Infinity)
        const delivered = inPeriod.filter((o) => o.status === 'delivered')
        const revenue = delivered.reduce((s, o) => s + itemsTotal(o), 0)
        // The period just before, for the % change
        const prev = span === null ? null : between(loadedAt - 2 * span, loadedAt - span)
        const prevDelivered = prev?.filter((o) => o.status === 'delivered') ?? null
        const prevRevenue = prevDelivered?.reduce((s, o) => s + itemsTotal(o), 0) ?? null
        const customers = data.customers?.[period]
        const change = (now: number | undefined, before: number | null | undefined, format?: Change['format']): Change | null =>
          now === undefined || before === null || before === undefined ? null : { now, prev: before, format }
        return [
          { label: 'Total Orders', value: inPeriod.length, icon: ClipboardList, color: 'text-[#ff923e]', bg: 'bg-[#ff923e]/10', filtered: true, change: change(inPeriod.length, prev?.length) },
          { label: 'Pending', value: data.orders.filter((o) => o.status === 'pending').length, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10', filtered: false, change: null },
          { label: 'In Progress', value: data.orders.filter((o) => o.status === 'in_progress').length, icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10', filtered: false, change: null },
          { label: 'Delivered', value: delivered.length, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', filtered: true, change: change(delivered.length, prevDelivered?.length) },
          { label: 'Revenue', value: formatNaira(revenue), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', filtered: true, change: change(revenue, prevRevenue, formatNaira) },
          { label: 'Customers', value: customers?.customers ?? '—', icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10', filtered: true, change: change(customers?.customers, customers?.prevCustomers) },
          { label: 'New Customers', value: customers?.new ?? '—', icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10', filtered: true, change: change(customers?.new, customers?.prevNew) },
          { label: 'Total Items', value: data.totalItems, icon: ShoppingBag, color: 'text-sky-400', bg: 'bg-sky-500/10', filtered: false, change: null },
          { label: 'Strikes', value: `${data.strikes} / ${STRIKE_LIMIT}`, icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', filtered: false, change: null },
        ]
      })()
    : []

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e0e5f9]">Overview</h1>
          <p className="text-[#a5abbd] mt-1">Welcome back, {vendor?.name}</p>
        </div>
        <div role="group" aria-label="Period" className="flex bg-[#152035] rounded-full p-1 overflow-x-auto max-w-full">
          {PERIODS.map(({ value, label }) => (
            <button key={value} onClick={() => setPeriod(value)} aria-pressed={period === value}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                period === value ? 'bg-[#ff923e] text-white' : 'text-[#a5abbd] hover:text-[#e0e5f9]'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 rounded-2xl px-5 py-4 mb-8 text-sm">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          {STRIKE_LIMIT} cancelled orders (declined, not accepted within 48 hours, or not picked up within 1 hour of a rider
          being assigned) will deactivate this store&apos;s bot. A deactivated bot can only be reinstated by calling ASAP support.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#1c2a42] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {statCards.map(({ label, value, icon: Icon, color, bg, filtered, change }) => (
              <div key={label} className="bg-[#152035] rounded-2xl p-5">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="text-2xl font-bold text-[#e0e5f9] tabular-nums">{value}</div>
                <div className="text-sm text-[#a5abbd] mt-0.5">{label}</div>
                <div className="text-xs text-[#a5abbd]/60 mt-0.5">{filtered ? current.hint : 'Right now'}</div>
                {change && <ChangeLine change={change} vs={current.vs} />}
              </div>
            ))}
          </div>

          <div className="bg-[#152035] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-[#a5abbd]" />
              <h2 className="font-semibold text-[#e0e5f9]">Recent Orders</h2>
            </div>
            {data!.orders.length === 0 ? (
              <div className="px-6 py-12 text-center text-[#a5abbd]">No orders yet</div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {data!.orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="px-6 py-4 flex items-center justify-between bg-[#0d1525]">
                    <div>
                      <p className="text-sm font-medium text-[#e0e5f9]">Order #{order.id}</p>
                      <p className="text-xs text-[#a5abbd] mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-[#e0e5f9]">{formatNaira(itemsTotal(order))}</span>
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
