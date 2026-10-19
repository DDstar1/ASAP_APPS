'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2, XCircle, Clock } from 'lucide-react'
import {
  getMyAssets, getMySlots, getEarnings, verifyPurchase, assetType, naira, pct, PENDING_PURCHASE_KEY,
  type InvestAssetWithPlan, type InvestSlot, type Earning, type PurchaseStatus,
} from '@/lib/invest'
import { ASSET_TYPE_LABEL } from '@/lib/investMedia'
import { AssetStill } from '@/components/invest/AssetMedia'
import { useInvest } from '@/components/invest/InvestContext'

const POLL_MS = 3000
const POLL_TRIES = 6

type Data = { assets: InvestAssetWithPlan[]; slots: InvestSlot[]; earnings: Earning[] }

export default function AssetsPage() {
  return (
    <Suspense fallback={null}>
      <Assets />
    </Suspense>
  )
}

function readPending() {
  try { return sessionStorage.getItem(PENDING_PURCHASE_KEY) } catch { return null }
}

function Assets() {
  const { userId, refreshUnread } = useInvest()
  const params = useSearchParams()
  const [reference] = useState(() => params.get('reference') ?? readPending())
  const [payment, setPayment] = useState<PurchaseStatus | 'checking' | 'error' | null>(reference ? 'checking' : null)
  const [data, setData] = useState<Data | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([getMyAssets(), getMySlots(userId), getEarnings(userId)]).then(([a, s, e]) => {
      if (cancelled) return
      setData({ assets: a.data, slots: (s.data ?? []) as InvestSlot[], earnings: (e.data ?? []) as Earning[] })
    })
    return () => { cancelled = true }
  }, [userId, reloadKey])

  useEffect(() => {
    if (!reference) return
    let cancelled = false
    async function check(tries: number) {
      try {
        const { status } = await verifyPurchase(reference!)
        if (cancelled) return
        if (status === 'pending' && tries > 1) {
          setTimeout(() => { if (!cancelled) check(tries - 1) }, POLL_MS)
          return
        }
        setPayment(status)
        if (status !== 'pending') {
          try { sessionStorage.removeItem(PENDING_PURCHASE_KEY) } catch {}
        }
        if (status === 'paid') { setReloadKey((k) => k + 1); refreshUnread() }
      } catch {
        if (!cancelled) setPayment('error')
      }
    }
    check(POLL_TRIES)
    return () => { cancelled = true }
  }, [reference, refreshUnread])

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-inv-text">My Assets</h1>

      {payment && <PaymentBanner status={payment} onClose={() => setPayment(null)} />}

      {data === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-3xl bg-inv-surface border border-inv-line animate-pulse" />)}
        </div>
      ) : data.assets.length === 0 ? (
        <div className="rounded-3xl bg-inv-surface border border-inv-line p-12 text-center">
          <p className="font-semibold text-inv-text">You don&apos;t own any assets yet.</p>
          <p className="text-sm text-inv-muted mt-1">Buy a slot in a bike and it will show up here.</p>
          <Link href="/invest" className="inline-block mt-5 px-5 py-2.5 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white text-sm font-semibold">
            See plans
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.assets.map((asset) => {
            const share = data.slots.filter((s) => s.asset_id === asset.id).reduce((n, s) => n + Number(s.slot_pct ?? 0), 0)
            const earned = data.earnings.filter((e) => e.asset_id === asset.id).reduce((n, e) => n + e.amount, 0)
            return (
              <Link key={asset.id} href={`/invest/assets/${asset.id}`}
                className="rounded-3xl bg-inv-surface border border-inv-line overflow-hidden transition-all duration-300 hover:border-[#ff923e]/60 hover:shadow-[0_0_0_4px_rgba(255,146,62,0.12),0_16px_40px_rgba(255,146,62,0.25)]">
                <AssetStill type={assetType(asset)} className="aspect-4/3 w-full" />
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-inv-accent-text">{ASSET_TYPE_LABEL[assetType(asset)]}</p>
                  <p className="font-mono text-xl font-bold text-inv-text mt-0.5">{asset.code}</p>
                  <dl className="grid grid-cols-2 gap-3 mt-4">
                    <div className="rounded-2xl bg-inv-soft px-4 py-3">
                      <dt className="text-xs text-inv-muted">Share</dt>
                      <dd className="font-bold text-inv-text mt-0.5 tabular-nums">{share > 0 ? pct(share) : 'Transferred'}</dd>
                    </div>
                    <div className="rounded-2xl bg-inv-soft px-4 py-3">
                      <dt className="text-xs text-inv-muted">Total earned</dt>
                      <dd className="font-bold text-inv-text mt-0.5 tabular-nums">{naira(earned)}</dd>
                    </div>
                  </dl>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PaymentBanner({ status, onClose }: { status: PurchaseStatus | 'checking' | 'error'; onClose: () => void }) {
  const view = {
    checking: { icon: Loader2, spin: true, tone: 'bg-inv-surface border-inv-line text-inv-text', text: 'Confirming your payment…' },
    pending: { icon: Clock, spin: false, tone: 'bg-amber-500/10 border-amber-500/30 text-amber-700', text: 'Your payment is still processing. Your slot will appear here once it clears.' },
    paid: { icon: CheckCircle, spin: false, tone: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700', text: 'Payment confirmed. Your slot is secured.' },
    expired: { icon: XCircle, spin: false, tone: 'bg-red-500/10 border-red-500/30 text-red-600', text: 'The 30-minute hold ran out before payment completed, so the slot was released.' },
    failed: { icon: XCircle, spin: false, tone: 'bg-red-500/10 border-red-500/30 text-red-600', text: 'The payment failed. You have not been charged.' },
    refunded: { icon: XCircle, spin: false, tone: 'bg-red-500/10 border-red-500/30 text-red-600', text: 'This payment was refunded.' },
    error: { icon: XCircle, spin: false, tone: 'bg-red-500/10 border-red-500/30 text-red-600', text: 'We couldn’t confirm your payment right now. Refresh in a minute.' },
  }[status]
  return (
    <div role="status" className={`flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm ${view.tone}`}>
      <view.icon className={`w-5 h-5 shrink-0 ${view.spin ? 'animate-spin' : ''}`} />
      <p className="flex-1">{view.text}</p>
      {status !== 'checking' && (
        <button onClick={onClose} className="text-xs font-semibold underline underline-offset-2 cursor-pointer">Dismiss</button>
      )}
    </div>
  )
}
