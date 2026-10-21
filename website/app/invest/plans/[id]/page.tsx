'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, MapPin, ShieldCheck, FileText, Gauge, Info } from 'lucide-react'
import { getInvestPlan, getOpenAssets, naira, pct, slotPct, type InvestPlan, type OpenAsset } from '@/lib/invest'
import { PLAN_CONTENT, ownershipTerms } from '@/lib/investContent'
import { ASSET_MEDIA } from '@/lib/investMedia'

function SlotPie({ filled, total, active }: { filled: number; total: number; active: boolean }) {
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 40 40" className="w-11 h-11" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="8" className={active ? 'stroke-white/25' : 'stroke-inv-line'} />
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="8" strokeDasharray={`${(filled / total) * c} ${c}`}
        transform="rotate(-90 20 20)" className={active ? 'stroke-white' : 'stroke-[#ff923e]'} />
    </svg>
  )
}

function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  const days = Math.ceil(ms / 86_400_000)
  return days <= 1 ? 'Sale closes today' : `Sale closes in ${days} days`
}

export default function PlanDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [plan, setPlan] = useState<InvestPlan | null | undefined>(undefined)
  const [asset, setAsset] = useState<OpenAsset | null>(null)
  const [view, setView] = useState(0)
  const [slots, setSlots] = useState(1)

  useEffect(() => {
    let cancelled = false
    Promise.all([getInvestPlan(Number(id)), getOpenAssets()]).then(([planRes, openRes]) => {
      if (cancelled) return
      setPlan(planRes.data)
      const forSale = openRes.data
        .filter((a) => a.plan_id === Number(id))
        .sort((a, b) => a.funding_ends_at.localeCompare(b.funding_ends_at))
      setAsset(forSale[0] ?? null)
    })
    return () => { cancelled = true }
  }, [id])

  if (plan === undefined) {
    return <div className="h-[560px] rounded-3xl bg-inv-surface border border-inv-line animate-pulse" />
  }
  if (plan === null) {
    return (
      <div className="rounded-3xl bg-inv-surface border border-inv-line p-12 text-center">
        <p className="text-inv-text font-semibold">This plan isn&apos;t available.</p>
        <Link href="/invest" className="inline-block mt-4 text-sm font-semibold text-inv-accent-text">Back to plans</Link>
      </div>
    )
  }

  const content = PLAN_CONTENT[plan.asset_type]
  const stills = ASSET_MEDIA[plan.asset_type].stills
  const still = stills[view] ?? stills[0]
  const options = Array.from({ length: plan.total_slots }, (_, i) => i + 1)
  const available = asset?.open_slots ?? 0
  const chosen = Math.min(slots, Math.max(available, 1))
  const share = slotPct(plan)
  const terms = ownershipTerms({ ownerPct: Number(plan.investor_pct), totalSlots: plan.total_slots, fundingDays: plan.funding_days })

  function buy() {
    if (!asset) return
    router.push(`/invest/checkout?plan=${plan!.id}&asset=${asset.asset_id}&slots=${chosen}`)
  }

  return (
    <div className="space-y-8">
      <Link href="/invest" className="inline-flex items-center gap-2 text-sm font-medium text-inv-muted hover:text-inv-text">
        <ArrowLeft className="w-4 h-4" /> All plans
      </Link>

      <section className="relative rounded-3xl bg-inv-surface border border-inv-line overflow-hidden shadow-[0_24px_60px_rgba(13,21,37,0.08)]">
        <div className="grid lg:grid-cols-[1.25fr_1fr]">
          <div className="relative flex flex-col">
            <div aria-hidden className="absolute -left-24 -top-24 w-[115%] aspect-square rounded-full bg-inv-soft" />
            <div className="relative aspect-4/3 lg:aspect-auto lg:flex-1 lg:min-h-[440px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={still.src} src={still.src} alt={still.alt}
                className="absolute inset-0 w-full h-full object-cover animate-[fadeIn_.4s_ease-out]" />
            </div>
            <div className="relative hidden lg:flex items-end justify-between gap-4 px-10 py-8">
              <div>
                <p className="text-xs uppercase tracking-wider text-inv-muted">Price</p>
                <p className="text-3xl font-bold text-inv-text tabular-nums">{naira(plan.slot_price * chosen)}</p>
              </div>
              <BuyButton disabled={!asset} onClick={buy} />
            </div>
          </div>

          <div className="relative p-6 sm:p-10 flex flex-col gap-8">
            <div>
              <h1 className="text-3xl font-bold text-inv-text">{plan.name}</h1>
              <p className="text-inv-muted mt-1.5">{plan.description || content.tagline}</p>
              {asset ? (
                <p className="mt-3 inline-flex flex-wrap items-center gap-2 text-sm text-inv-muted">
                  <span className="px-2.5 py-1 rounded-full bg-inv-soft font-mono font-semibold text-inv-text">{asset.code}</span>
                  {daysLeft(asset.funding_ends_at)}
                </p>
              ) : (
                <p className="mt-3 text-sm font-medium text-inv-accent-text">Sold out. A new bike goes on sale soon.</p>
              )}
            </div>

            {stills.length > 1 && (
              <div>
                <h2 className="text-sm font-semibold text-inv-text">Views</h2>
                <div className="flex flex-wrap gap-3 mt-3 pb-3 border-b border-inv-line">
                  {stills.map((s, i) => (
                    <button key={s.src} onClick={() => setView(i)} aria-label={s.alt} aria-pressed={i === view}
                      className={`w-11 h-11 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-inv-surface transition cursor-pointer ${
                        i === view ? 'ring-[#ff923e]' : 'ring-transparent hover:ring-inv-line'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold text-inv-text">Slots</h2>
              <div role="radiogroup" aria-label="Number of slots" className="flex flex-wrap gap-3 mt-4">
                {options.map((n) => {
                  const active = n === chosen && !!asset
                  const disabled = n > available
                  return (
                    <button key={n} role="radio" aria-checked={active} disabled={disabled} onClick={() => setSlots(n)}
                      className={`w-[92px] flex flex-col items-center gap-2 rounded-full px-2 pt-4 pb-5 border transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-20 ${
                        active
                          ? 'bg-linear-to-b from-[#ff923e] to-[#c46018] border-transparent text-white shadow-[0_12px_28px_rgba(255,146,62,0.4)] -translate-y-1.5'
                          : 'scale-[0.86] opacity-45 bg-inv-surface border-inv-line text-inv-text hover:opacity-80 hover:border-[#ff923e]/50'}`}>
                      <SlotPie filled={n} total={plan.total_slots} active={active} />
                      <span className="text-sm font-bold tabular-nums">{naira(plan.slot_price * n)}</span>
                      <span className={`text-xs leading-tight text-center ${active ? 'text-white/90' : 'text-inv-muted'}`}>
                        {n === plan.total_slots && n > 1 ? 'Whole bike' : `${n} of ${plan.total_slots}`}
                        <br />{pct(share * n)} per fare
                      </span>
                    </button>
                  )
                })}
              </div>
              {asset && available < plan.total_slots && (
                <p className="text-xs text-inv-muted mt-3">{available} of {plan.total_slots} slots left on this bike.</p>
              )}
            </div>

            <div className="lg:hidden flex items-end justify-between gap-4 pt-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-inv-muted">Price</p>
                <p className="text-2xl font-bold text-inv-text tabular-nums">{naira(plan.slot_price * chosen)}</p>
              </div>
              <BuyButton disabled={!asset} onClick={buy} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-6">
        <div className="space-y-6">
          <Section icon={Info} title="About this plan">
            <div className="space-y-3 text-inv-muted leading-relaxed">
              {content.overview.map((p) => <p key={p}>{p}</p>)}
            </div>
          </Section>

          <Section icon={FileText} title="Ownership terms">
            <dl className="divide-y divide-inv-line">
              {terms.map((t) => (
                <div key={t.title} className="py-4 first:pt-0 last:pb-0">
                  <dt className="font-semibold text-inv-text">{t.title}</dt>
                  <dd className="text-sm text-inv-muted mt-1 leading-relaxed">{t.body}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>

        <div className="space-y-6">
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
    </div>
  )
}

function BuyButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white font-semibold shadow-[0_10px_24px_rgba(255,146,62,0.4)] hover:shadow-[0_14px_32px_rgba(255,146,62,0.55)] transition cursor-pointer disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed">
      Buy now <ArrowRight className="w-4 h-4" />
    </button>
  )
}

function Section({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-inv-surface border border-inv-line p-6 sm:p-8">
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
