'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Gauge, MapPin, ShieldCheck, Route, Clock, Wallet, CalendarDays } from 'lucide-react'
import {
  getMyAsset, getMySlots, getEarnings, getAssetWeeklyStats, assetType, naira, pct, shortDate,
  type InvestAssetWithPlan, type InvestSlot, type Earning, type WeeklyStat, type AssetStatus,
} from '@/lib/invest'
import { PLAN_CONTENT } from '@/lib/investContent'
import { ASSET_MEDIA, ASSET_TYPE_LABEL } from '@/lib/investMedia'
import { useInvest } from '@/components/invest/InvestContext'

const STATUS: Record<AssetStatus, { label: string; tone: string }> = {
  funding: { label: 'On sale', tone: 'bg-amber-500/15 text-amber-700' },
  acquiring: { label: 'Being prepared', tone: 'bg-sky-500/15 text-sky-700' },
  active: { label: 'On the road', tone: 'bg-emerald-500/15 text-emerald-700' },
  retired: { label: 'Retired', tone: 'bg-inv-soft text-inv-muted' },
}

type Data = { asset: InvestAssetWithPlan | null; slots: InvestSlot[]; earnings: Earning[]; stats: WeeklyStat[] }

export default function AssetPage() {
  const { id } = useParams<{ id: string }>()
  const { userId } = useInvest()
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getMyAsset(id), getMySlots(userId), getEarnings(userId), getAssetWeeklyStats(id)]).then(([a, s, e, w]) => {
      if (cancelled) return
      setData({
        asset: a.data,
        slots: ((s.data ?? []) as InvestSlot[]).filter((x) => x.asset_id === id),
        earnings: ((e.data ?? []) as Earning[]).filter((x) => x.asset_id === id),
        stats: (w.data ?? []) as WeeklyStat[],
      })
    })
    return () => { cancelled = true }
  }, [id, userId])

  if (data === null) {
    return <div className="h-[480px] rounded-3xl bg-inv-surface border border-inv-line animate-pulse" />
  }
  const { asset, slots, earnings, stats } = data
  if (!asset) {
    return (
      <div className="rounded-3xl bg-inv-surface border border-inv-line p-12 text-center">
        <p className="font-semibold text-inv-text">This asset isn&apos;t available.</p>
        <Link href="/invest/assets" className="inline-block mt-4 text-sm font-semibold text-inv-accent-text">Back to my assets</Link>
      </div>
    )
  }

  const type = assetType(asset)
  const content = PLAN_CONTENT[type]
  const still = ASSET_MEDIA[type].stills[0]
  const status = STATUS[asset.status]
  const share = slots.reduce((n, s) => n + Number(s.slot_pct ?? 0), 0)
  const paid = slots.reduce((n, s) => n + Number(s.price_paid ?? 0), 0)
  const since = slots.map((s) => s.acquired_at).filter(Boolean).sort()[0] ?? null
  const earned = earnings.reduce((n, e) => n + e.amount, 0)
  const totals = stats.reduce((t, w) => ({
    trips: t.trips + w.trips,
    km: t.km + Number(w.distance_km),
    hours: t.hours + Number(w.active_hours),
    days: t.days + w.active_days,
  }), { trips: 0, km: 0, hours: 0, days: 0 })

  const allTime = [
    { label: 'Total earned', value: naira(earned), icon: Wallet },
    { label: 'Trips', value: totals.trips.toLocaleString('en-NG'), icon: Route },
    { label: 'Distance', value: `${Math.round(totals.km).toLocaleString('en-NG')} km`, icon: Gauge },
    { label: 'Hours on the road', value: Math.round(totals.hours).toLocaleString('en-NG'), icon: Clock },
    { label: 'Days on the road', value: totals.days.toLocaleString('en-NG'), icon: CalendarDays },
  ]

  return (
    <div className="space-y-8">
      <Link href="/invest/assets" className="inline-flex items-center gap-2 text-sm font-medium text-inv-muted hover:text-inv-text">
        <ArrowLeft className="w-4 h-4" /> My assets
      </Link>

      <section className="rounded-3xl bg-inv-surface border border-inv-line overflow-hidden shadow-[0_24px_60px_rgba(13,21,37,0.08)]">
        <div className="grid lg:grid-cols-[1.2fr_1fr]">
          <div className="relative aspect-4/3 lg:aspect-auto lg:min-h-[460px] bg-inv-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={still.src} alt={still.alt} className="absolute inset-0 w-full h-full object-cover" />
          </div>

          <div className="p-6 sm:p-10 flex flex-col gap-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-inv-accent-text">{ASSET_TYPE_LABEL[type]}</p>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${status.tone}`}>{status.label}</span>
              </div>
              <h1 className="font-mono text-3xl font-bold text-inv-text mt-1">{asset.code}</h1>
              <p className="text-inv-muted mt-1">{asset.vehicle_name || asset.plan?.name}</p>
            </div>

            <dl className="divide-y divide-inv-line text-sm">
              <Row label="Plate number" value={asset.plate_number ?? 'Assigned when the bike is registered'} mono={!!asset.plate_number} />
              <Row label="Your slots" value={slots.length > 0 ? `${slots.length} of ${asset.plan?.total_slots ?? '—'}` : 'Transferred'} />
              <Row label="Your share" value={share > 0 ? `${pct(share)} of every fare` : '—'} />
              {paid > 0 && <Row label="You paid" value={naira(paid)} />}
              {since && <Row label="Owner since" value={shortDate(since)} />}
              {asset.status === 'funding' && <Row label="Sale closes" value={shortDate(asset.funding_ends_at)} />}
              {asset.activated_at && <Row label="On the road since" value={shortDate(asset.activated_at)} />}
            </dl>

            <div>
              <h2 className="text-sm font-semibold text-inv-text mb-3">All time</h2>
              <div className="grid grid-cols-2 gap-3">
                {allTime.map(({ label, value, icon: Icon }, i) => (
                  <div key={label} className={`rounded-2xl bg-inv-soft px-4 py-3 ${i === 0 ? 'col-span-2' : ''}`}>
                    <p className="flex items-center gap-1.5 text-xs text-inv-muted"><Icon className="w-3.5 h-3.5" />{label}</p>
                    <p className={`font-bold text-inv-text mt-1 tabular-nums ${i === 0 ? 'text-2xl' : 'text-lg'}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-6">
        <Section icon={Gauge} title="Specifications">
          <dl className="divide-y divide-inv-line">
            {content.specs.map((s) => (
              <div key={s.label} className="flex justify-between gap-4 py-3 first:pt-0 last:pb-0 text-sm">
                <dt className="text-inv-muted">{s.label}</dt>
                <dd className="font-medium text-inv-text text-right">{s.value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section icon={ShieldCheck} title="Safety kit">
          <ul className="space-y-2.5">
            {content.safetyKit.map((k) => (
              <li key={k} className="flex items-center gap-2.5 text-sm text-inv-text">
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                {k}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={MapPin} title="Service area">
          <p className="text-sm text-inv-muted">{content.serviceArea.summary}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {content.serviceArea.zones.map((z) => (
              <span key={z} className="px-3 py-1.5 rounded-full bg-inv-soft text-xs font-medium text-inv-text">{z}</span>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-3 first:pt-0">
      <dt className="text-inv-muted">{label}</dt>
      <dd className={`font-medium text-inv-text text-right ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: typeof Gauge; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-inv-surface border border-inv-line p-6">
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-inv-text mb-4">
        <span className="w-9 h-9 rounded-xl bg-[#ff923e]/12 text-inv-accent-text flex items-center justify-center">
          <Icon className="w-4.5 h-4.5" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}
