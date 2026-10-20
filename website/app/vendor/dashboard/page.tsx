'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ShoppingBag, ClipboardList, Wallet, Clock, CheckCircle, AlertTriangle, Users, UserPlus, Bike,
  ArrowUpRight, ArrowDownRight, Minus, ChevronRight,
} from 'lucide-react'
import { STRIKE_LIMIT } from '@/lib/vendorGuidelines'
import {
  getVendorOrders, getVendorItemIds, getVendorStrikes, getVendorCustomerStats,
  type CustomerStats, type StatsPeriod,
} from '@/lib/supabase_queries'
import { useVendor } from '@/store/vendorStore'
import { itemsTotal } from '@/lib/supabase'
import type { OrderRow } from '@/lib/supabase'
import AreaChart, { type Point } from '@/components/vendor/AreaChart'

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
  { value: 'all', label: 'All', hint: 'All time', vs: '', days: null },
]

const HOUR = 3_600_000
const DAY = 24 * HOUR

type Change = { now: number; prev: number; format?: (n: number) => string }

// "▲ 12% · +3 vs previous 7 days". No % when the previous period was 0.
function ChangeLine({ change, vs }: { change: Change; vs: string }) {
  const diff = change.now - change.prev
  const fmt = change.format ?? ((n: number) => n.toLocaleString('en-NG'))
  const pct = change.prev > 0 ? Math.round((diff / change.prev) * 100) : null
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus
  const color = diff > 0 ? 'text-v-up' : diff < 0 ? 'text-v-down' : 'text-v-muted'
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  return (
    <div className="flex flex-wrap items-center gap-x-1 text-xs mt-1">
      <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${color}`}>
        <Icon className="w-3.5 h-3.5" aria-hidden />
        {pct !== null && <>{Math.abs(pct)}% · </>}
        {sign}{fmt(Math.abs(diff))}
      </span>
      <span className="text-v-muted">{vs}</span>
    </div>
  )
}

function formatNaira(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

function compactNaira(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { notation: 'compact', maximumFractionDigits: 1 })
}

// Equal slices of the period, oldest first, for the charts
function buckets(period: StatsPeriod, now: number, firstOrderAt: number) {
  const fmt = (t: number, opts: Intl.DateTimeFormatOptions) => new Date(t).toLocaleString('en-NG', opts)
  const make = (count: number, span: number, label: (start: number) => string) =>
    Array.from({ length: count }, (_, i) => {
      const start = now - (count - i) * span
      return { start, end: start + span, label: label(start) }
    })
  switch (period) {
    case 'day': return make(24, HOUR, (t) => fmt(t + HOUR, { hour: 'numeric' }))
    case 'week': return make(7, DAY, (t) => fmt(t + DAY, { weekday: 'short' }))
    case 'month': return make(30, DAY, (t) => fmt(t + DAY, { day: 'numeric', month: 'short' }))
    case 'year': return make(12, (365 * DAY) / 12, (t) => fmt(t + DAY, { month: 'short' }))
    case 'all': {
      const total = Math.max(now - firstOrderAt, 7 * DAY)
      const span = total / 12
      return make(12, span, (t) => fmt(t + span, total > 120 * DAY
        ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' }))
    }
  }
}

const TILE = {
  violet: { bg: 'var(--v-violet-bg)', ink: 'var(--v-violet-ink)' },
  mint: { bg: 'var(--v-mint-bg)', ink: 'var(--v-mint-ink)' },
  butter: { bg: 'var(--v-butter-bg)', ink: 'var(--v-butter-ink)' },
  sky: { bg: 'var(--v-sky-bg)', ink: 'var(--v-sky-ink)' },
  peach: { bg: 'var(--v-peach-bg)', ink: 'var(--v-peach-ink)' },
  rose: { bg: 'var(--v-rose-bg)', ink: 'var(--v-rose-ink)' },
}

export default function DashboardPage() {
  const { vendor } = useVendor()
  const [data, setData] = useState<Data | null>(null)
  const [period, setPeriod] = useState<StatsPeriod>('week')
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
  const periodIndex = PERIODS.findIndex((p) => p.value === period)

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold text-v-text tracking-tight">Overview</h1>
          <p className="text-v-muted mt-1">Welcome back, {vendor?.name}</p>
        </div>
        <div role="radiogroup" aria-label="Period" className="relative grid grid-cols-5 bg-v-card rounded-full p-1 w-full sm:w-80">
          <span aria-hidden className="absolute top-1 bottom-1 left-1 rounded-full bg-v-text shadow-sm transition-transform duration-300 ease-out"
            style={{ width: 'calc((100% - 8px) / 5)', transform: `translateX(${periodIndex * 100}%)` }} />
          {PERIODS.map(({ value, label, hint }) => (
            <button key={value} role="radio" aria-checked={period === value} title={hint} onClick={() => setPeriod(value)}
              className={`relative z-10 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                period === value ? 'text-v-surface' : 'text-v-muted hover:text-v-text'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {data && !loading && (
        <div className="flex items-start gap-3 bg-[var(--v-butter-bg)] text-v-warn rounded-2xl px-5 py-4 mb-6 text-sm animate-rise">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            {STRIKE_LIMIT} cancelled orders (declined, not accepted within 48 hours, or not picked up within 1 hour of a rider
            being assigned) deactivate this store&apos;s bot. Only ASAP support can reinstate it.
          </p>
        </div>
      )}

      {loading || !data ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-5">
          <div className="space-y-5">
            {[0, 1, 2].map((i) => <div key={i} className="h-52 bg-v-card rounded-3xl animate-pulse" />)}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 content-start">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 bg-v-card rounded-3xl animate-pulse" />)}
          </div>
        </div>
      ) : (
        <Content data={data} period={period} current={current} loadedAt={loadedAt} />
      )}
    </div>
  )
}

function Content({ data, period, current, loadedAt }: {
  data: Data; period: StatsPeriod; current: (typeof PERIODS)[number]; loadedAt: number
}) {
  const span = current.days === null ? null : current.days * DAY
  const between = (from: number, to: number) =>
    data.orders.filter((o) => { const t = new Date(o.created_at).getTime(); return t > from && t <= to })
  const inPeriod = span === null ? data.orders : between(loadedAt - span, Infinity)
  const delivered = inPeriod.filter((o) => o.status === 'delivered')
  const revenue = delivered.reduce((s, o) => s + itemsTotal(o), 0)
  const prev = span === null ? null : between(loadedAt - 2 * span, loadedAt - span)
  const prevDelivered = prev?.filter((o) => o.status === 'delivered') ?? null
  const prevRevenue = prevDelivered?.reduce((s, o) => s + itemsTotal(o), 0) ?? null
  const customers = data.customers?.[period]
  const change = (now: number | undefined, before: number | null | undefined, format?: Change['format']): Change | null =>
    now === undefined || before === null || before === undefined ? null : { now, prev: before, format }

  const firstOrderAt = data.orders.length
    ? Math.min(...data.orders.map((o) => new Date(o.created_at).getTime()))
    : loadedAt - 7 * DAY
  const slices = buckets(period, loadedAt, firstOrderAt)
  const series = (pick: (orders: OrderRow[]) => number): Point[] =>
    slices.map((b) => ({ label: b.label, value: pick(between(b.start, b.end)) }))

  const wide = [
    {
      label: 'Total Orders', icon: ClipboardList, tile: TILE.violet,
      value: inPeriod.length.toLocaleString('en-NG'), change: change(inPeriod.length, prev?.length),
      points: series((os) => os.length), format: (n: number) => `${n} order${n === 1 ? '' : 's'}`,
    },
    {
      label: 'Revenue', icon: Wallet, tile: TILE.mint,
      value: formatNaira(revenue), change: change(revenue, prevRevenue, formatNaira),
      points: series((os) => os.filter((o) => o.status === 'delivered').reduce((s, o) => s + itemsTotal(o), 0)),
      format: compactNaira,
    },
    {
      label: 'Customers', icon: Users, tile: TILE.sky,
      value: customers ? customers.customers.toLocaleString('en-NG') : '—',
      change: change(customers?.customers, customers?.prevCustomers),
      points: series((os) => new Set(os.filter((o) => o.user_id !== null && o.status !== 'pending' && o.status !== 'cancelled').map((o) => o.user_id)).size),
      format: (n: number) => `${n} ordering`,
    },
  ]

  const small = [
    { label: 'Pending', value: data.orders.filter((o) => o.status === 'pending').length, icon: Clock, tile: TILE.butter,
      hint: 'Right now', href: '/vendor/dashboard/orders?tab=accept' },
    { label: 'In Progress', value: data.orders.filter((o) => o.status === 'in_progress').length, icon: Bike, tile: TILE.violet,
      hint: 'Right now', href: '/vendor/dashboard/orders?tab=active' },
    { label: 'Delivered', value: delivered.length, icon: CheckCircle, tile: TILE.mint, hint: current.hint,
      change: change(delivered.length, prevDelivered?.length) },
    { label: 'New Customers', value: customers?.new ?? '—', icon: UserPlus, tile: TILE.sky, hint: current.hint,
      change: change(customers?.new, customers?.prevNew) },
    { label: 'Total Items', value: data.totalItems, icon: ShoppingBag, tile: TILE.peach, hint: 'In your store',
      href: '/vendor/dashboard/items' },
    { label: 'Strikes', value: `${data.strikes} / ${STRIKE_LIMIT}`, icon: AlertTriangle, tile: TILE.rose, hint: 'Cancelled orders' },
  ]

  const recentDelivered = data.orders.filter((o) => o.status === 'delivered').slice(0, 6)

  return (
    <>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-5 mb-8">
        <div className="space-y-5">
          {wide.map(({ label, icon: Icon, tile, value, change: c, points, format }, i) => (
            <section key={label} className="rounded-3xl p-5 animate-rise" style={{ background: tile.bg, animationDelay: `${i * 70}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-v-text">
                    <span className="w-8 h-8 rounded-xl bg-v-surface/70 flex items-center justify-center" style={{ color: tile.ink }}>
                      <Icon className="w-4 h-4" />
                    </span>
                    {label}
                  </p>
                  <p className="text-3xl font-bold text-v-text mt-3 tabular-nums truncate">{value}</p>
                  {c ? <ChangeLine change={c} vs={current.vs} /> : <p className="text-xs text-v-muted mt-1">{current.hint}</p>}
                </div>
              </div>
              <div className="mt-4">
                <AreaChart points={points} ink={tile.ink} format={format} name={`${label}, ${current.hint}`} />
              </div>
            </section>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 auto-rows-fr gap-5">
          {small.map(({ label, value, icon: Icon, tile, hint, href, change: c }, i) => {
            const body = (
              <>
                <div className="flex items-start justify-between">
                  <span className="w-10 h-10 rounded-2xl bg-v-surface/70 flex items-center justify-center" style={{ color: tile.ink }}>
                    <Icon className="w-5 h-5" />
                  </span>
                  {href && (
                    <span className="w-8 h-8 rounded-full bg-v-surface/70 flex items-center justify-center text-v-text group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <div className="mt-auto pt-6">
                  <p className="text-3xl font-bold text-v-text tabular-nums">{value}</p>
                  <p className="text-sm font-medium text-v-text mt-1">{label}</p>
                  {c ? <ChangeLine change={c} vs={current.vs} /> : <p className="text-xs text-v-muted mt-0.5">{hint}</p>}
                </div>
              </>
            )
            const attention = label === 'Pending' && typeof value === 'number' && value > 0
            const className = 'group flex flex-col rounded-3xl p-5 min-h-44 animate-rise'
            const style = { background: tile.bg, animationDelay: `${120 + i * 60}ms` }
            // The flicker wraps the tile so it doesn't fight the load-in animation
            const wrap = (node: React.ReactNode) =>
              attention ? <div key={label} className="rounded-3xl animate-flicker">{node}</div> : node
            return wrap(href ? (
              <Link key={label} href={href} aria-label={`${label}: ${value}. Open`}
                className={`${className} h-full hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all`} style={style}>
                {body}
              </Link>
            ) : (
              <div key={label} className={`${className} h-full`} style={style}>{body}</div>
            ))
          })}
        </div>
      </div>

      <section className="rounded-3xl border border-v-line overflow-hidden animate-rise" style={{ animationDelay: '480ms' }}>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-v-text">Recently delivered</h2>
          <Link href="/vendor/dashboard/orders?tab=done" className="inline-flex items-center gap-1 text-sm font-semibold text-[#c46018] hover:gap-2 transition-all">
            All orders <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {recentDelivered.length === 0 ? (
          <p className="px-6 pb-10 pt-4 text-center text-v-muted">No delivered orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-v-muted border-y border-v-line">
                  <th className="font-medium px-6 py-3">Order</th>
                  <th className="font-medium px-6 py-3">Date</th>
                  <th className="font-medium px-6 py-3">Items</th>
                  <th className="font-medium px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentDelivered.map((order) => (
                  <tr key={order.id} className="border-b border-v-line last:border-0 hover:bg-v-card transition-colors">
                    <td className="px-6 py-4 font-semibold text-v-text">#{order.id}</td>
                    <td className="px-6 py-4 text-v-muted whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-v-muted">
                      <span className="line-clamp-1">{order.items?.map((it) => `${it.quantity}× ${it.name}`).join(', ') || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-v-text tabular-nums whitespace-nowrap">{formatNaira(itemsTotal(order))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
