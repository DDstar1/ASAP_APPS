'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Lock, AlertCircle } from 'lucide-react'
import {
  getInvestPlan, getOpenAssets, getBankDetails, naira, pct, slotPct, startPurchase, PENDING_PURCHASE_KEY,
  type InvestPlan, type OpenAsset,
} from '@/lib/invest'
import { AssetStill } from '@/components/invest/AssetMedia'
import { useInvest } from '@/components/invest/InvestContext'
import SecuritySetupModal from '@/components/invest/SecuritySetupModal'

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="h-96 rounded-3xl bg-inv-surface border border-inv-line animate-pulse" />}>
      <Checkout />
    </Suspense>
  )
}

function Checkout() {
  const params = useSearchParams()
  const planId = Number(params.get('plan'))
  const assetId = params.get('asset') ?? ''
  const slots = Math.max(1, Number(params.get('slots')) || 1)

  const [plan, setPlan] = useState<InvestPlan | null | undefined>(undefined)
  const [asset, setAsset] = useState<OpenAsset | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const { userId } = useInvest()
  const [hasBank, setHasBank] = useState(false)
  const [settingUp, setSettingUp] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getInvestPlan(planId), getOpenAssets(), getBankDetails(userId)]).then(([planRes, openRes, bankRes]) => {
      if (cancelled) return
      setPlan(planRes.data)
      setAsset(openRes.data.find((a) => a.asset_id === assetId) ?? null)
      setHasBank(!!bankRes.data)
    })
    return () => { cancelled = true }
  }, [planId, assetId, userId])

  async function pay(bankReady = hasBank) {
    if (!asset) return
    if (!bankReady) { setSettingUp(true); return }
    setPaying(true)
    setError('')
    try {
      const purchase = await startPurchase(asset.asset_id, slots, `${window.location.origin}/invest/assets`)
      try { sessionStorage.setItem(PENDING_PURCHASE_KEY, purchase.reference) } catch {}
      window.location.assign(purchase.checkout_url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the payment. Try again.')
      setPaying(false)
    }
  }

  if (plan === undefined) {
    return <div className="h-96 rounded-3xl bg-inv-surface border border-inv-line animate-pulse" />
  }

  const unavailable = !plan || !asset || asset.open_slots < slots
  const total = plan ? plan.slot_price * slots : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href={plan ? `/invest/plans/${plan.id}` : '/invest'}
        className="inline-flex items-center gap-2 text-sm font-medium text-inv-muted hover:text-inv-text">
        <ArrowLeft className="w-4 h-4" /> Back to plan
      </Link>

      <h1 className="text-3xl font-bold text-inv-text">Checkout</h1>

      {!plan || unavailable ? (
        <div className="rounded-3xl bg-inv-surface border border-inv-line p-8 text-center">
          <p className="font-semibold text-inv-text">
            {!plan ? 'This plan isn’t available.' : 'Those slots are no longer available.'}
          </p>
          <Link href={plan ? `/invest/plans/${plan.id}` : '/invest'}
            className="inline-block mt-4 text-sm font-semibold text-inv-accent-text">Choose again</Link>
        </div>
      ) : (
        <div className="rounded-3xl bg-inv-surface border border-inv-line overflow-hidden">
          <div className="flex flex-col sm:flex-row">
            <AssetStill type={plan.asset_type} className="sm:w-64 aspect-4/3 sm:aspect-auto shrink-0" />
            <div className="flex-1 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-inv-text">{plan.name}</h2>
              <p className="text-sm text-inv-muted mt-1">
                Bike <span className="font-mono font-semibold text-inv-text">{asset!.code}</span>
              </p>
              <dl className="mt-6 space-y-3 text-sm">
                <Row label="Slots" value={`${slots} of ${plan.total_slots}`} />
                <Row label="Price per slot" value={naira(plan.slot_price)} />
                <Row label="Your share of every fare" value={pct(slotPct(plan) * slots)} />
                <div className="border-t border-inv-line pt-3 flex justify-between items-baseline">
                  <dt className="font-semibold text-inv-text">Total</dt>
                  <dd className="text-2xl font-bold text-inv-text tabular-nums">{naira(total)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="border-t border-inv-line p-6 sm:p-8 space-y-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-[#ff923e] cursor-pointer" />
              <span className="text-sm text-inv-text">
                I have read and agree to the{' '}
                <Link href={`/invest/plans/${plan.id}`} className="font-semibold text-inv-accent-text underline underline-offset-2">ownership terms</Link>.
              </span>
            </label>

            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </p>
            )}

            <button onClick={() => pay()} disabled={!agreed || paying}
              className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white font-semibold shadow-[0_10px_24px_rgba(255,146,62,0.4)] transition cursor-pointer disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed">
              {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
              {paying ? 'Opening secure payment…' : `Pay ${naira(total)}`}
            </button>
            <p className="text-xs text-inv-muted text-center">
              Your {slots === 1 ? 'slot is' : 'slots are'} held for 30 minutes while you pay.
            </p>
          </div>
        </div>
      )}

      {settingUp && (
        <SecuritySetupModal onClose={() => setSettingUp(false)}
          onDone={() => { setHasBank(true); setSettingUp(false); pay(true) }} />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-inv-muted">{label}</dt>
      <dd className="font-medium text-inv-text tabular-nums">{value}</dd>
    </div>
  )
}
