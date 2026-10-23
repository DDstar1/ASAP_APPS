'use client'

import { useState } from 'react'
import { CalendarRange, RefreshCw } from 'lucide-react'
import { PRESETS, RANGES, lagosToday, monthsBack, samePeriod, type Envelope } from '@/lib/admin'
import { useAdmin } from '@/components/admin/AdminContext'

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <h1 className="text-3xl font-bold text-inv-text">{title}</h1>
      {children}
    </div>
  )
}

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-inv-surface border border-inv-line p-6 ${className}`}>
      {title && <h2 className="text-lg font-bold text-inv-text mb-4">{title}</h2>}
      {children}
    </section>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'warn' | 'bad' }) {
  const color = tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-inv-text'
  return (
    <div className="rounded-3xl bg-inv-surface border border-inv-line p-5">
      <p className="text-sm text-inv-muted">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-inv-muted mt-1 tabular-nums">{sub}</p>}
    </div>
  )
}

// Label / value lines inside a card
export function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-inv-line">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0 text-sm">
          <dt className="text-inv-muted">{k}</dt>
          <dd className="font-semibold text-inv-text tabular-nums text-right">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Pills<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void; label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex bg-inv-soft rounded-full p-1 overflow-x-auto max-w-full">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} disabled={o.disabled} aria-pressed={value === o.value}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
            value === o.value ? 'bg-inv-surface text-inv-text shadow-sm' : 'text-inv-muted hover:text-inv-text'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Loading({ className = 'h-64' }: { className?: string }) {
  return <div className={`rounded-3xl bg-inv-surface border border-inv-line animate-pulse ${className}`} />
}

export function ErrorNote({ message }: { message: string }) {
  return <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-600">{message}</p>
}

// "Updated 14:05 · refreshes every 60s" under period-based pages
export function Freshness({ reply, onRefresh }: { reply: Envelope<unknown> | null; onRefresh: () => void }) {
  if (!reply) return null
  const time = new Date(reply.generated_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
  return (
    <p className="flex items-center gap-2 text-xs text-inv-muted">
      Updated {time}{reply.refresh_secs ? ` · refreshes every ${reply.refresh_secs}s` : ' · past period, not refreshing'}
      <button onClick={onRefresh} aria-label="Refresh now" className="p-1 rounded-full hover:bg-inv-soft cursor-pointer">
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </p>
  )
}

// Presets, longer ranges, or any from/to (Rust allows up to 2 years)
export function PeriodPicker() {
  const { period, setPeriod } = useAdmin()
  const [custom, setCustom] = useState(false)
  const today = lagosToday()
  const [from, setFrom] = useState('from' in period ? period.from : today)
  const [to, setTo] = useState('to' in period ? period.to : today)
  const isCustom = 'from' in period && !RANGES.some((r) => samePeriod(period, monthsBack(r.months)))

  const chip = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition cursor-pointer ${
      active ? 'bg-linear-to-r from-[#ff923e] to-[#c46018] text-white shadow-[0_6px_16px_rgba(255,146,62,0.3)]' : 'text-inv-muted hover:text-inv-text hover:bg-inv-soft'}`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Period">
        {PRESETS.map((p) => (
          <button key={p.value} onClick={() => { setPeriod({ preset: p.value }); setCustom(false) }}
            className={chip(samePeriod(period, { preset: p.value }))}>{p.label}</button>
        ))}
        {RANGES.map((r) => (
          <button key={r.months} onClick={() => { setPeriod(monthsBack(r.months)); setCustom(false) }}
            className={chip(samePeriod(period, monthsBack(r.months)))}>{r.label}</button>
        ))}
        <button onClick={() => setCustom((c) => !c)} className={`${chip(isCustom)} inline-flex items-center gap-1.5`}>
          <CalendarRange className="w-4 h-4" /> {isCustom && 'from' in period ? `${period.from} → ${period.to}` : 'Dates'}
        </button>
      </div>

      {custom && (
        <form className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => { e.preventDefault(); if (from <= to) { setPeriod({ from, to }); setCustom(false) } }}>
          <label className="text-sm text-inv-muted">From
            <input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)}
              className="block mt-1 px-3 py-2 rounded-xl border border-inv-line bg-inv-surface text-inv-text" />
          </label>
          <label className="text-sm text-inv-muted">To
            <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)}
              className="block mt-1 px-3 py-2 rounded-xl border border-inv-line bg-inv-surface text-inv-text" />
          </label>
          <button type="submit" disabled={from > to}
            className="px-5 py-2.5 rounded-full bg-inv-text text-inv-surface text-sm font-semibold cursor-pointer disabled:opacity-40">
            Apply
          </button>
        </form>
      )}
    </div>
  )
}

// Bar chart for a timeseries; the last bar is the most recent bucket
export function Bars({ points, format }: { points: { t: string; value: number; label: string }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...points.map((p) => p.value))
  const every = Math.ceil(points.length / 12)
  return (
    <div className={`flex items-end h-56 ${points.length > 40 ? 'gap-px' : 'gap-1.5'}`} role="img"
      aria-label={points.map((p) => `${p.label}: ${format(p.value)}`).join(', ')}>
      {points.map((p, i) => (
        <div key={p.t} title={`${p.label}: ${format(p.value)}`} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full min-w-0">
          <div className={`w-full max-w-10 rounded-t-md ${i === points.length - 1 ? 'bg-[#ff923e]' : 'bg-[#ff923e]/35'}`}
            style={{ height: `${Math.max(1.5, (p.value / max) * 100)}%` }} />
          <span className={`text-[10px] text-inv-muted tabular-nums whitespace-nowrap ${(points.length - 1 - i) % every === 0 ? '' : 'invisible'}`}>
            {p.label}
          </span>
        </div>
      ))}
    </div>
  )
}
