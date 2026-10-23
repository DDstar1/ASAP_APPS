'use client'

import { useState } from 'react'
import { naira } from '@/lib/invest'
import { getAssets, periodQuery, count, minutesLabel, label, type AssetRow } from '@/lib/admin'
import { useAdmin } from '@/components/admin/AdminContext'
import { useDashboard } from '@/components/admin/useDashboard'
import { ErrorNote, Freshness, Loading, PageTitle, PeriodPicker, Pills } from '@/components/admin/ui'

type Sort = 'code' | 'trips' | 'fares' | 'online'

// Rust returns assets by code; the other orders are applied here
const SORTERS: Record<Sort, (a: AssetRow, b: AssetRow) => number> = {
  code: (a, b) => a.code.localeCompare(b.code),
  trips: (a, b) => b.trips_completed - a.trips_completed,
  fares: (a, b) => b.gross_fares_kobo - a.gross_fares_kobo,
  online: (a, b) => b.online_minutes - a.online_minutes,
}

const STATUS_TONE: Record<string, string> = {
  funding: 'bg-amber-500/15 text-amber-700',
  acquiring: 'bg-sky-500/15 text-sky-700',
  active: 'bg-emerald-500/15 text-emerald-700',
  retired: 'bg-inv-soft text-inv-muted',
}

export default function AssetsPage() {
  const { period } = useAdmin()
  const [sort, setSort] = useState<Sort>('code')
  const res = useDashboard(() => getAssets(period), periodQuery(period))
  const assets = res.data?.assets ? [...res.data.assets].sort(SORTERS[sort]) : null

  const th = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-inv-muted whitespace-nowrap'
  const td = 'px-4 py-3 text-sm text-inv-text whitespace-nowrap tabular-nums'

  return (
    <div>
      <PageTitle title="Assets">
        <Freshness reply={res.reply} onRefresh={res.reload} />
      </PageTitle>

      <div className="mb-6 space-y-4">
        <PeriodPicker />
        <Pills label="Sort by" value={sort} onChange={setSort} options={[
          { value: 'code', label: 'Code' },
          { value: 'trips', label: 'Trips' },
          { value: 'fares', label: 'Fares' },
          { value: 'online', label: 'Online time' },
        ]} />
      </div>

      {res.error && <ErrorNote message={res.error} />}

      {!assets ? <Loading className="h-96" /> : assets.length === 0 ? (
        <p className="text-center text-inv-muted py-20">No assets yet.</p>
      ) : (
        <div className="rounded-3xl bg-inv-surface border border-inv-line overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-inv-line">
              <tr>
                <th className={th}>Asset</th>
                <th className={th}>Status</th>
                <th className={th}>Slots</th>
                <th className={th}>Driver</th>
                <th className={th}>Trips</th>
                <th className={th}>Gross fares</th>
                <th className={th}>Owners&apos; pool</th>
                <th className={th}>Online</th>
                <th className={th}>Drivers</th>
                <th className={th}>Active days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inv-line">
              {assets.map((a) => (
                <tr key={a.asset_id} className="hover:bg-inv-soft/50">
                  <td className={td}>
                    <p className="font-mono font-semibold">{a.code}</p>
                    <p className="text-xs text-inv-muted">{[a.plan, a.vehicle_name, a.plate_number].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className={td}>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_TONE[a.status] ?? 'bg-inv-soft text-inv-muted'}`}>
                      {label(a.status)}
                    </span>
                  </td>
                  <td className={td}>
                    {count(a.slots.investor)} owned · {count(a.slots.business)} ASAP · {count(a.slots.open)} open
                  </td>
                  <td className={td}>{a.current_driver ?? <span className="text-inv-muted">None</span>}</td>
                  <td className={td}>{count(a.trips_completed)} <span className="text-xs text-inv-muted">· {count(a.distance_km)} km</span></td>
                  <td className={td}>{naira(a.gross_fares_kobo)}</td>
                  <td className={td}>{naira(a.investor_pool_kobo)}</td>
                  <td className={td}>{minutesLabel(a.online_minutes)}</td>
                  <td className={td}>{count(a.drivers)}</td>
                  <td className={td}>{count(a.active_days)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
