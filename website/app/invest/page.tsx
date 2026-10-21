'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getInvestPlans, type InvestPlan } from '@/lib/invest'
import { PLAN_CONTENT } from '@/lib/investContent'
import { AssetShowcase } from '@/components/invest/AssetMedia'
import EmptyState from '@/components/invest/EmptyState'
import { Bike } from 'lucide-react'

// Two per row with the 1.5rem gap; a row with fewer cards stays centred
const CARD_WIDTH = 'w-full md:w-[calc(50%-0.75rem)] max-w-2xl'

export default function PlansPage() {
  const [plans, setPlans] = useState<InvestPlan[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getInvestPlans().then(({ data, error }) => {
      if (cancelled) return
      if (error) setError('Could not load the plans. Refresh to try again.')
      setPlans((data ?? []) as InvestPlan[])
    })
    return () => { cancelled = true }
  }, [])

  if (plans === null) {
    return (
      <div className="flex flex-wrap justify-center gap-6">
        {[0, 1].map((i) => <div key={i} className={`${CARD_WIDTH} h-[520px] rounded-3xl bg-inv-surface border border-inv-line animate-pulse`} />)}
      </div>
    )
  }

  return (
    <div>
      {error && <p role="alert" className="mb-6 text-sm text-red-600">{error}</p>}
      {plans.length === 0 && !error ? (
        <EmptyState icon={Bike} title="No plans on sale right now" body="Check back soon for the next bike." />
      ) : (
        <div className="flex flex-wrap justify-center gap-6">
          {plans.map((plan) => (
            <Link key={plan.id} href={`/invest/plans/${plan.id}`}
              className={`${CARD_WIDTH} group flex flex-col rounded-3xl bg-inv-surface border border-inv-line overflow-hidden transition-all duration-300 hover:border-[#ff923e]/60 hover:shadow-[0_0_0_4px_rgba(255,146,62,0.12),0_20px_60px_rgba(255,146,62,0.35)] focus-visible:outline-none focus-visible:border-[#ff923e] focus-visible:shadow-[0_0_0_4px_rgba(255,146,62,0.25)]`}>
              <AssetShowcase type={plan.asset_type} className="aspect-4/3 w-full" />
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-bold text-inv-text">{plan.name}</h2>
                  <span className="shrink-0 px-3 py-1 rounded-full bg-inv-soft text-sm font-semibold text-inv-text tabular-nums">
                    {plan.total_slots} {plan.total_slots === 1 ? 'slot' : 'slots'}
                  </span>
                </div>
                <p className="text-inv-muted mt-2">{plan.description || PLAN_CONTENT[plan.asset_type].tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
