'use client'

import { useState } from 'react'
import { naira } from '@/lib/invest'
import { getDrivers, periodQuery, count, minutesLabel, ratio, label, type DriverSort } from '@/lib/admin'
import { useAdmin } from '@/components/admin/AdminContext'
import { useDashboard } from '@/components/admin/useDashboard'
import { ErrorNote, Freshness, Loading, PageTitle, PeriodPicker, Pills } from '@/components/admin/ui'

const SORTS: { value: DriverSort; label: string }[] = [
  { value: 'trips', label: 'Trips' },
  { value: 'earnings', label: 'Earnings' },
  { value: 'online', label: 'Online time' },
  { value: 'acceptance', label: 'Acceptance' },
  { value: 'disputes', label: 'Disputes' },
]

const STATUS_TONE: Record<string, string> = {
  available: 'bg-emerald-500/15 text-emerald-700',
  busy: 'bg-sky-500/15 text-sky-700',
  offline: 'bg-inv-soft text-inv-muted',
}

// Every driver, idle ones too, ranked by Rust in the chosen order
export default function DriversPage() {
  const { period } = useAdmin()
  const [sort, setSort] = useState<DriverSort>('trips')
  const res = useDashboard(() => getDrivers(period, sort), `${periodQuery(period)}|${sort}`)
  const drivers = res.data?.drivers

  const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-inv-muted whitespace-nowrap'
  const td = 'px-4 py-3 text-sm text-inv-text whitespace-nowrap tabular-nums'

  return (
    <div>
      <PageTitle title="Drivers">
        <Freshness reply={res.reply} onRefresh={res.reload} />
      </PageTitle>

      <div className="mb-6 space-y-4">
        <PeriodPicker />
        <Pills label="Sort by" value={sort} options={SORTS} onChange={setSort} />
      </div>

      {res.error && <ErrorNote message={res.error} />}

      {!drivers ? <Loading className="h-96" /> : drivers.length === 0 ? (
        <p className="text-center text-inv-muted py-20">No drivers yet.</p>
      ) : (
        <div className="rounded-3xl bg-inv-surface border border-inv-line overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-inv-line">
              <tr>
                <th className={th}>#</th>
                <th className={th}>Driver</th>
                <th className={th}>Status</th>
                <th className={th}>Asset</th>
                <th className={th}>Trips</th>
                <th className={th}>Earnings</th>
                <th className={th}>Acceptance</th>
                <th className={th}>Online</th>
                <th className={th}>On trips</th>
                <th className={th}>Utilisation</th>
                <th className={th}>Disputes</th>
                <th className={th}>Active days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inv-line">
              {drivers.map((d) => (
                <tr key={d.driver_id} className="hover:bg-inv-soft/50">
                  <td className={`${td} text-inv-muted`}>{d.rank}</td>
                  <td className={td}>
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-xs text-inv-muted">
                      {[d.vehicle_type, d.plate_number, d.phone].filter(Boolean).join(' · ')}
                    </p>
                  </td>
                  <td className={td}>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_TONE[d.status] ?? 'bg-inv-soft text-inv-muted'}`}>
                      {label(d.status)}
                    </span>
                  </td>
                  <td className={`${td} font-mono`}>{d.current_asset ?? '—'}</td>
                  <td className={td}>
                    {count(d.trips_completed)}
                    {d.trips_cancelled > 0 && <span className="text-xs text-inv-muted"> · {count(d.trips_cancelled)} cancelled</span>}
                  </td>
                  <td className={td}>{naira(d.driver_earnings_kobo)}</td>
                  <td className={td}>
                    {ratio(d.acceptance_rate)}
                    <span className="text-xs text-inv-muted"> · {count(d.offers_accepted)}/{count(d.offers_received)}</span>
                  </td>
                  <td className={td}>{minutesLabel(d.online_minutes)}</td>
                  <td className={td}>{minutesLabel(d.on_trip_minutes)}</td>
                  <td className={td}>{ratio(d.utilisation)}</td>
                  <td className={td}>
                    <span className={d.disputes_rejected > 0 ? 'text-red-600 font-semibold' : ''}>{count(d.disputes_raised)}</span>
                    {d.disputes_raised > 0 && (
                      <span className="text-xs text-inv-muted"> · {count(d.disputes_upheld)} upheld, {count(d.disputes_rejected)} at fault</span>
                    )}
                  </td>
                  <td className={td}>{count(d.active_days)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-inv-muted mt-3">
        Earnings are estimated from trip fares and the 55% / 85% split. Utilisation is time on trips divided by time online.
      </p>
    </div>
  )
}
