'use client'

import { useId, useState } from 'react'

export type Point = { label: string; value: number }

type Props = {
  points: Point[]
  // CSS colour of the line/fill, e.g. 'var(--v-violet-ink)'
  ink: string
  format: (n: number) => string
  name: string
  height?: number
}

const W = 300

export default function AreaChart({ points, ink, format, name, height = 88 }: Props) {
  const gradientId = useId()
  const [hover, setHover] = useState<number | null>(null)
  const n = points.length
  if (n === 0) return null

  const max = Math.max(...points.map((p) => p.value), 1)
  const pad = 6
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W)
  const y = (v: number) => pad + (1 - v / max) * (height - pad * 2)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n - 1)},${height} L${x(0)},${height} Z`

  function pick(clientX: number, rect: DOMRect) {
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setHover(Math.round(ratio * (n - 1)))
  }

  const active = hover ?? null
  const leftPct = active === null ? 0 : (x(active) / W) * 100
  const topPct = active === null ? 0 : (y(points[active].value) / height) * 100

  return (
    <figure className="relative select-none" aria-label={`${name}: ${points.map((p) => `${p.label} ${format(p.value)}`).join(', ')}`}>
      <div className="relative touch-none" style={{ height }}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ink} stopOpacity="0.28" />
              <stop offset="100%" stopColor={ink} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
            vectorEffect="non-scaling-stroke" />
          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={0} y2={height} stroke={ink} strokeOpacity="0.5"
              strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {active !== null && (
          <>
            <span className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow pointer-events-none"
              style={{ left: `${leftPct}%`, top: `${topPct}%`, background: ink }} />
            <div role="status" className="absolute -translate-x-1/2 -translate-y-full -mt-3 px-2.5 py-1 rounded-full bg-[#0d1525] text-white text-xs font-semibold whitespace-nowrap pointer-events-none tabular-nums"
              style={{ left: `clamp(48px, ${leftPct}%, calc(100% - 48px))`, top: `${topPct}%` }}>
              {format(points[active].value)} · <span className="font-normal text-white/70">{points[active].label}</span>
            </div>
          </>
        )}
      </div>
      <figcaption className="flex justify-between mt-1.5 text-[11px] text-v-muted tabular-nums" aria-hidden>
        <span>{points[0].label}</span>
        {n > 2 && <span>{points[Math.floor((n - 1) / 2)].label}</span>}
        <span>{points[n - 1].label}</span>
      </figcaption>
    </figure>
  )
}
