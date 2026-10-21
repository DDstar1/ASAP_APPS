'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownRight, Minus, BarChart3 } from 'lucide-react'
import EmptyState from '@/components/invest/EmptyState'
import {
  getMyAssets, getAssetWeeklyStats, assetType, isoWeek, weekRange,
  type InvestAssetWithPlan, type WeeklyStat,
} from '@/lib/invest'
import { ASSET_TYPE_LABEL } from '@/lib/investMedia'

const RANGES = [
  { value: '12w', label: '12 weeks', weeks: 12 },
  { value: '6m', label: '6 months', weeks: 26 },
  { value: '1y', label: '1 year', weeks: 52 },
  { value: 'all', label: 'All time', weeks: null },
] as const

type Range = (typeof RANGES)[number]['value']
type Bar = { key: string; label: string; title: string; trips: number }

export default function PerformancePage() {
  const [assets, setAssets] = useState<InvestAssetWithPlan[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [stats, setStats] = useState<{ assetId: string; rows: WeeklyStat[] } | null>(null)
  const [range, setRange] = useState<Range>('12w')

  useEffect(() => {
    let cancelled = false
    getMyAssets().then(({ data }) => {
      if (!cancelled) setAssets(data.filter((a) => a.status !== 'funding'))
    })
    return () => { cancelled = true }
  }, [])

  const asset = assets?.find((a) => a.id === selected) ?? assets?.[0] ?? null
  const assetId = asset?.id ?? null

  useEffect(() => {
    if (!assetId) return
    let cancelled = false
    getAssetWeeklyStats(assetId).then(({ data }) => {
      if (!cancelled) setStats({ assetId, rows: (data ?? []) as WeeklyStat[] })
    })
    return () => { cancelled = true }
  }, [assetId])

  if (assets === null) {
    return <div className="h-96 rounded-3xl bg-inv-surface border border-inv-line animate-pulse" />
  }

  if (!asset) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-inv-text">Performance</h1>
        <EmptyState icon={BarChart3} title="Nothing to show yet" body="Performance shows here once your asset is on the road." />
      </div>
    )
  }

  const loading = stats?.assetId !== asset.id
  const weeks = loading ? [] : stats!.rows
  const [latest, previous] = weeks
  const current = RANGES.find((r) => r.value === range)!
  const bars = toBars(weeks, current.weeks)
  const maxTrips = Math.max(1, ...bars.map((b) => b.trips))
  const rangeTrips = bars.reduce((n, b) => n + b.trips, 0)
  const labelEvery = Math.ceil(bars.length / 12)

  const cards = latest ? [
    { label: 'Trips', now: latest.trips, prev: previous?.trips, fmt: (n: number) => n.toLocaleString('en-NG') },
    { label: 'Distance', now: Number(latest.distance_km), prev: previous && Number(previous.distance_km), fmt: (n: number) => `${Math.round(n).toLocaleString('en-NG')} km` },
    { label: 'Hours on the road', now: Number(latest.active_hours), prev: previous && Number(previous.active_hours), fmt: (n: number) => n.toFixed(1) },
    { label: 'Days on the road', now: latest.active_days, prev: previous?.active_days, fmt: (n: number) => `${n} of 7` },
  ] : []

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-inv-text">Performance</h1>

      {assets.length > 1 && (
        <div role="tablist" aria-label="Asset" className="flex flex-wrap gap-2">
          {assets.map((a) => (
            <button key={a.id} role="tab" aria-selected={a.id === asset.id} onClick={() => setSelected(a.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
                a.id === asset.id ? 'bg-inv-text text-inv-surface' : 'bg-inv-surface border border-inv-line text-inv-muted hover:text-inv-text'}`}>
              <span className="font-mono">{a.code}</span>
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-inv-muted">
        {ASSET_TYPE_LABEL[assetType(asset)]} · <span className="font-mono text-inv-text">{asset.code}</span>
        {latest && <> · Week {isoWeek(latest.week_start)}, {weekRange(latest.week_start)}</>}
      </p>

      {loading ? (
        <div className="h-72 rounded-3xl bg-inv-surface border border-inv-line animate-pulse" />
      ) : !latest ? (
        <EmptyState icon={BarChart3} title="No weekly update yet" body="The first weekly update for this asset is on its way." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-3xl bg-inv-surface border border-inv-line p-5">
                <p className="text-sm text-inv-muted">{c.label}</p>
                <p className="text-2xl font-bold text-inv-text mt-1 tabular-nums">{c.fmt(c.now)}</p>
                {c.prev !== undefined && <Change now={c.now} prev={c.prev} />}
              </div>
            ))}
          </div>

          <section className="rounded-3xl bg-inv-surface border border-inv-line p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-inv-text">{current.weeks === null && bars.length > 0 && weeks.length > 52 ? 'Trips per month' : 'Trips per week'}</h2>
                <p className="text-sm text-inv-muted mt-0.5 tabular-nums">{rangeTrips.toLocaleString('en-NG')} trips · {current.label.toLowerCase()}</p>
              </div>
              <div role="group" aria-label="Chart range" className="flex bg-inv-soft rounded-full p-1 overflow-x-auto max-w-full">
                {RANGES.map((r) => (
                  <button key={r.value} onClick={() => setRange(r.value)} aria-pressed={range === r.value}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                      range === r.value ? 'bg-inv-surface text-inv-text shadow-sm' : 'text-inv-muted hover:text-inv-text'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`mt-6 flex items-end h-52 ${bars.length > 26 ? 'gap-0.5' : 'gap-2'}`} role="img"
              aria-label={bars.map((b) => `${b.title}: ${b.trips} trips`).join(', ')}>
              {bars.map((b, i) => (
                <div key={b.key} title={`${b.title}: ${b.trips} trips`}
                  className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full min-w-0">
                  {bars.length <= 12 && <span className="text-[11px] font-semibold text-inv-text tabular-nums">{b.trips}</span>}
                  <div className={`w-full max-w-10 rounded-t-md ${i === bars.length - 1 ? 'bg-[#ff923e]' : 'bg-[#ff923e]/35'}`}
                    style={{ height: `${Math.max(2, (b.trips / maxTrips) * 100)}%` }} />
                  <span className={`text-[11px] text-inv-muted tabular-nums whitespace-nowrap ${
                    (bars.length - 1 - i) % labelEvery === 0 ? '' : 'invisible'}`}>{b.label}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// Weekly bars up to a year; all time beyond a year is grouped by month
function toBars(weeks: WeeklyStat[], limit: number | null): Bar[] {
  const chosen = (limit === null ? weeks : weeks.slice(0, limit)).slice().reverse()
  if (limit !== null || chosen.length <= 52) {
    return chosen.map((w) => ({
      key: w.week_start,
      label: `W${isoWeek(w.week_start)}`,
      title: `Week ${isoWeek(w.week_start)}, ${weekRange(w.week_start)}`,
      trips: w.trips,
    }))
  }
  const months = new Map<string, Bar>()
  for (const w of chosen) {
    const d = new Date(w.week_start + 'T00:00:00')
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const bar = months.get(key) ?? {
      key,
      label: d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }),
      title: d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }),
      trips: 0,
    }
    bar.trips += w.trips
    months.set(key, bar)
  }
  return [...months.values()]
}

function Change({ now, prev }: { now: number; prev: number }) {
  const diff = now - prev
  const pctChange = prev > 0 ? Math.round((diff / prev) * 100) : null
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus
  const color = diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-inv-muted'
  return (
    <p className={`flex items-center gap-1 text-xs font-medium mt-1.5 ${color}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {pctChange !== null ? `${Math.abs(pctChange)}%` : diff === 0 ? 'No change' : 'New'}
      <span className="text-inv-muted font-normal">vs last week</span>
    </p>
  )
}
