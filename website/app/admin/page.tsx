'use client'

import { useState } from 'react'
import { naira } from '@/lib/invest'
import {
  getOverview, getSeries, periodQuery, count, minutesLabel, ratio, label,
  type Bucket, type Metric, type Period,
} from '@/lib/admin'
import { useAdmin } from '@/components/admin/AdminContext'
import { useDashboard } from '@/components/admin/useDashboard'
import { Bars, Card, ErrorNote, Freshness, Loading, PageTitle, PeriodPicker, Pills, Rows, Stat } from '@/components/admin/ui'

const METRICS: { value: Metric; label: string }[] = [
  { value: 'orders', label: 'Orders' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'trips', label: 'Trips' },
  { value: 'cancellations', label: 'Cancellations' },
]

// Days covered by a period, to pick a sensible bucket; Rust caps hourly at 31 days
function periodDays(p: Period) {
  if ('preset' in p) return { today: 1, yesterday: 1, '7d': 7, '30d': 30, this_month: 31, last_month: 31 }[p.preset]
  return Math.round((Date.parse(p.to) - Date.parse(p.from)) / 86_400_000) + 1
}

function defaultBucket(days: number): Bucket {
  if (days <= 2) return 'hour'
  if (days <= 62) return 'day'
  if (days <= 200) return 'week'
  return 'month'
}

// Buckets come back as Lagos wall-clock times with no offset, so read them as local times
function bucketLabel(t: string, bucket: Bucket) {
  const d = new Date(t)
  if (bucket === 'hour') return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
  if (bucket === 'month') return d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' })
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

const nairaWhole = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG')

export default function OverviewPage() {
  const { period } = useAdmin()
  const days = periodDays(period)
  const [metric, setMetric] = useState<Metric>('orders')
  // null: follow the period; set once the admin picks a bucket themselves
  const [picked, setPicked] = useState<Bucket | null>(null)
  const bucket = picked === 'hour' && days > 31 ? 'day' : picked ?? defaultBucket(days)

  const overview = useDashboard(() => getOverview(period), periodQuery(period))
  const series = useDashboard(() => getSeries(period, metric, bucket), `${periodQuery(period)}|${metric}|${bucket}`)
  const o = overview.data

  const format = metric === 'revenue' ? nairaWhole : count
  const points = (series.data?.series ?? []).map((p) => ({ ...p, label: bucketLabel(p.t, bucket) }))
  const total = points.reduce((n, p) => n + p.value, 0)

  return (
    <div>
      <PageTitle title="Overview">
        <Freshness reply={overview.reply} onRefresh={() => { overview.reload(); series.reload() }} />
      </PageTitle>

      <div className="mb-8"><PeriodPicker /></div>

      {overview.error && <ErrorNote message={overview.error} />}

      {!o ? <Loading className="h-32" /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Orders created" value={count(o.orders.created)} sub={`${count(o.deliveries.count)} delivered`} />
          <Stat label="Charged on the app" value={nairaWhole(o.deliveries.app_charged_naira)}
            sub={`${nairaWhole(o.deliveries.insurance_naira)} insurance`} />
          <Stat label="Trips completed" value={count(o.trips.completed)} sub={`${count(o.trips.distance_km)} km`} />
          <Stat label="Gross fares" value={naira(o.trips.gross_fares_kobo)} sub={`${naira(o.trips.treasury_kobo)} to treasury`} />
          <Stat label="Active drivers" value={count(o.trips.active_drivers)} sub={`${minutesLabel(o.trips.online_minutes)} online`} />
          <Stat label="Offer acceptance" value={ratio(o.offers.received ? o.offers.accepted / o.offers.received : null)}
            sub={`${count(o.offers.accepted)} of ${count(o.offers.received)} offers`} />
          <Stat label="Cancellations" value={count(o.cancellations.total)} sub={`${count(o.cancellations.after_pickup)} after pickup`}
            tone={o.cancellations.total > 0 ? 'warn' : undefined} />
          <Stat label="New users" value={count(o.users.new)} />
        </div>
      )}

      <Card className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-inv-text">{METRICS.find((m) => m.value === metric)!.label}</h2>
            <p className="text-sm text-inv-muted mt-0.5 tabular-nums">{format(total)} in this period</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pills label="Metric" value={metric} options={METRICS} onChange={setMetric} />
            <Pills label="Group by" value={bucket} onChange={(b) => setPicked(b)} options={[
              { value: 'hour', label: 'Hour', disabled: days > 31 },
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]} />
          </div>
        </div>
        <div className="mt-6">
          {series.error ? <ErrorNote message={series.error} />
            : !series.data ? <div className="h-56 animate-pulse rounded-2xl bg-inv-soft" />
            : <Bars points={points} format={format} />}
        </div>
      </Card>

      {o && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          <Card title="Orders by status">
            <Rows rows={Object.entries(o.orders.by_status).map(([k, v]) => [label(k), count(v)])} />
          </Card>
          <Card title="Orders by source">
            <Rows rows={Object.entries(o.orders.by_source).map(([k, v]) => [label(k), count(v)])} />
          </Card>
          <Card title="Cancellations">
            <Rows rows={[
              ['By customer', count(o.cancellations.by_customer)],
              ['By driver', count(o.cancellations.by_driver)],
              ['By the system', count(o.cancellations.by_system)],
              ['After pickup', count(o.cancellations.after_pickup)],
            ]} />
          </Card>
          <Card title="Money from trips">
            <Rows rows={[
              ['Gross fares', naira(o.trips.gross_fares_kobo)],
              ['Driver earnings', naira(o.trips.driver_earnings_kobo)],
              ['Asset owners’ pool', naira(o.trips.asset_pool_kobo)],
              ['Treasury', naira(o.trips.treasury_kobo)],
            ]} />
          </Card>
          <Card title="Driver offers">
            <Rows rows={[
              ['Received', count(o.offers.received)],
              ['Accepted', count(o.offers.accepted)],
              ['Rejected', count(o.offers.rejected)],
              ['Expired', count(o.offers.expired)],
            ]} />
          </Card>
          <Card title="Disputes">
            <Rows rows={[
              ['Raised', count(o.disputes.raised)],
              ['Pending', count(o.disputes.pending)],
              ['Upheld (driver right)', count(o.disputes.upheld)],
              ['Rejected (driver at fault)', count(o.disputes.rejected)],
            ]} />
          </Card>
          <Card title="Owners">
            <Rows rows={[
              ['Slots bought', `${count(o.invest.purchases.slots)} in ${count(o.invest.purchases.count)} purchases`],
              ['Paid for slots', naira(o.invest.purchases.amount_kobo)],
              ['Earnings credited', naira(o.invest.earnings_credited_kobo)],
              ['Withdrawals requested', `${naira(o.invest.withdrawals_requested.amount_kobo)} (${count(o.invest.withdrawals_requested.count)})`],
              ['Withdrawals paid', `${naira(o.invest.withdrawals_paid.amount_kobo)} (${count(o.invest.withdrawals_paid.count)})`],
            ]} />
          </Card>
          <Card title="Driver applications">
            {Object.keys(o.applications).length === 0
              ? <p className="text-sm text-inv-muted">None in this period.</p>
              : <Rows rows={Object.entries(o.applications).map(([k, v]) => [label(k), count(v)])} />}
          </Card>
        </div>
      )}
    </div>
  )
}
