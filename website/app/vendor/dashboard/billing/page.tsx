'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle, CheckCircle, CreditCard, Landmark, Loader2, Receipt, Sparkles, Check, X,
} from 'lucide-react'
import { getBillingPlans, getBillingSubscription, getBillingPayments } from '@/lib/supabase_queries'
import { useVendor } from '@/store/vendorStore'
import type { BillingPlanRow, BillingSubscriptionRow, BillingPaymentRow } from '@/lib/supabase'

const primaryClass =
  'py-2.5 px-5 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
const secondaryClass =
  'py-2.5 px-5 bg-[#1c2a42] text-[#e0e5f9] rounded-full text-sm font-medium hover:bg-[#253350] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'

const INTERVAL: Record<BillingPlanRow['interval'], string> = {
  daily: 'day', weekly: 'week', monthly: 'month', quarterly: '3 months', biannually: '6 months', annually: 'year',
}

const STATUS: Record<BillingSubscriptionRow['status'], { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'bg-emerald-500/15 text-emerald-400' },
  non_renewing: { label: 'Cancels at period end', tone: 'bg-amber-500/15 text-amber-400' },
  attention: { label: 'Payment failed', tone: 'bg-red-500/15 text-red-400' },
  cancelled: { label: 'Cancelled', tone: 'bg-[#a5abbd]/15 text-[#a5abbd]' },
  completed: { label: 'Ended', tone: 'bg-[#a5abbd]/15 text-[#a5abbd]' },
}

function formatNaira(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function methodLabel(channel: string | null) {
  if (channel === 'card') return 'Card'
  if (channel === 'bank_transfer') return 'Bank transfer'
  return channel ? channel.replace(/_/g, ' ') : '—'
}

type Billing = {
  vendorId: number
  plans: BillingPlanRow[]
  sub: BillingSubscriptionRow | null
  payments: BillingPaymentRow[]
}
type Notice = { kind: 'error' | 'success'; text: string }
type Busy = `checkout-${number}-${'card' | 'transfer'}` | 'manage' | 'cancel' | null

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Something went wrong. Please try again.')
  return json as T
}

export default function BillingPage() {
  // useSearchParams needs a Suspense boundary
  return (
    <Suspense fallback={null}>
      <Billing />
    </Suspense>
  )
}

function Billing() {
  const router = useRouter()
  const params = useSearchParams()
  const { vendor } = useVendor()
  const [data, setData] = useState<Billing | null>(null)
  const [reload, setReload] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const vendorId = vendor?.id ?? null

  useEffect(() => {
    if (vendorId === null) return
    let cancelled = false
    Promise.all([getBillingPlans(), getBillingSubscription(vendorId), getBillingPayments(vendorId)])
      .then(([plans, sub, payments]) => {
        if (cancelled) return
        setData({
          vendorId,
          plans: (plans.data ?? []) as BillingPlanRow[],
          sub: (sub.data ?? null) as BillingSubscriptionRow | null,
          payments: (payments.data ?? []) as BillingPaymentRow[],
        })
      })
    return () => { cancelled = true }
  }, [vendorId, reload])

  // Back from Paystack with ?reference=…: record it now rather than wait for the webhook
  const reference = params.get('reference')
  const verified = useRef<string | null>(null)
  useEffect(() => {
    if (!reference || vendorId === null || verified.current === reference) return
    verified.current = reference
    post<{ status: string }>('/api/billing/verify', { vendorId, reference })
      .then(({ status }) => setNotice(
        status === 'success'
          ? { kind: 'success', text: 'Payment received. Thank you!' }
          : { kind: 'error', text: 'That payment didn’t go through. You haven’t been charged.' },
      ))
      .catch((err: Error) => setNotice({ kind: 'error', text: err.message }))
      .finally(() => {
        setReload((n) => n + 1)
        router.replace('/vendor/dashboard/billing')
      })
  }, [reference, vendorId, router])

  if (!vendor) return null
  const loading = data?.vendorId !== vendor.id

  async function checkout(planId: number, method: 'card' | 'transfer') {
    setBusy(`checkout-${planId}-${method}`)
    setNotice(null)
    try {
      const { url } = await post<{ url: string }>('/api/billing/checkout', { vendorId: vendor!.id, planId, method })
      window.location.assign(url)
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message })
      setBusy(null)
    }
  }

  async function updateCard() {
    setBusy('manage')
    setNotice(null)
    try {
      const { url } = await post<{ url: string }>('/api/billing/manage', { vendorId: vendor!.id })
      window.open(url, '_blank', 'noopener')
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message })
    }
    setBusy(null)
  }

  async function cancel() {
    setBusy('cancel')
    setNotice(null)
    try {
      await post('/api/billing/cancel', { vendorId: vendor!.id })
      setNotice({ kind: 'success', text: 'Subscription cancelled. You won’t be charged again.' })
      setReload((n) => n + 1)
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message })
    }
    setConfirmingCancel(false)
    setBusy(null)
  }

  const sub = data?.sub ?? null
  const plans = data?.plans ?? []
  const planName = (id: number | null) => plans.find((p) => p.id === id)?.name ?? '—'
  const liveCard = sub?.method === 'card' && (sub.status === 'active' || sub.status === 'attention')
  const stillPaid = sub?.period_end != null && new Date(sub.period_end) > new Date()

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#e0e5f9]">Billing</h1>
        <p className="text-[#a5abbd] mt-0.5 text-sm">Your Zazu plan, how you pay, and past payments</p>
      </div>

      {notice && (
        <div role="status" className={`flex items-start gap-3 p-4 rounded-2xl text-sm ${
          notice.kind === 'error' ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'
        }`}>
          {notice.kind === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <p className="flex-1">{notice.text}</p>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="p-1 -m-1 rounded hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Current subscription */}
      <section aria-labelledby="current-plan" className="bg-[#152035] rounded-3xl p-6">
        <h2 id="current-plan" className="text-sm font-semibold text-[#a5abbd] uppercase tracking-wide mb-4">Current plan</h2>
        {loading ? (
          <div className="h-24 bg-[#1c2a42] rounded-2xl animate-pulse" />
        ) : !sub ? (
          <p className="text-[#a5abbd] text-sm">You’re not subscribed yet. Pick a plan below to get your store bot running.</p>
        ) : (
          <div className="space-y-5">
            {sub.status === 'attention' && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>We couldn’t charge your card for this period. Update your card and Paystack will try again.</p>
              </div>
            )}

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold text-[#e0e5f9]">{planName(sub.plan_id)}</p>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS[sub.status].tone}`}>
                    {STATUS[sub.status].label}
                  </span>
                </div>
                {sub.period_end && (
                  <p className="text-sm text-[#a5abbd] mt-1">
                    {sub.method === 'card' && sub.status === 'active' && `Renews on ${formatDate(sub.period_end)}`}
                    {sub.method === 'card' && sub.status === 'attention' && `Was due on ${formatDate(sub.period_end)}`}
                    {sub.method === 'card' && sub.status !== 'active' && sub.status !== 'attention' &&
                      (stillPaid ? `Access until ${formatDate(sub.period_end)}` : `Ended ${formatDate(sub.period_end)}`)}
                    {sub.method === 'transfer' &&
                      (stillPaid ? `Paid through ${formatDate(sub.period_end)}` : `Expired ${formatDate(sub.period_end)}`)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 px-4 py-3 bg-[#1c2a42] rounded-2xl">
                {sub.method === 'card' ? <CreditCard className="w-5 h-5 text-[#ff923e]" /> : <Landmark className="w-5 h-5 text-[#ff923e]" />}
                <div>
                  <p className="text-sm font-medium text-[#e0e5f9] capitalize">
                    {sub.method === 'card'
                      ? `${sub.card_brand ?? 'Card'} •••• ${sub.card_last4 ?? '····'}`
                      : 'Bank transfer'}
                  </p>
                  <p className="text-xs text-[#a5abbd]">
                    {sub.method === 'card'
                      ? (sub.card_exp ? `Expires ${sub.card_exp}` : 'Charged automatically')
                      : 'Pay again before it runs out'}
                  </p>
                </div>
              </div>
            </div>

            {liveCard && (
              <div className="flex flex-wrap gap-3">
                <button onClick={updateCard} disabled={busy !== null} className={secondaryClass}>
                  {busy === 'manage' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Update card
                </button>
                {confirmingCancel ? (
                  <div className="flex flex-wrap items-center gap-3 px-4 py-2 rounded-2xl bg-red-500/10">
                    <p className="text-sm text-red-300">Stop all future charges?</p>
                    <button onClick={cancel} disabled={busy !== null}
                      className="py-1.5 px-4 rounded-full bg-red-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                      {busy === 'cancel' && <Loader2 className="w-4 h-4 animate-spin" />}
                      Yes, cancel
                    </button>
                    <button onClick={() => setConfirmingCancel(false)} disabled={busy !== null}
                      className="py-1.5 px-4 rounded-full text-sm text-[#a5abbd] hover:text-[#e0e5f9]">
                      Keep plan
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmingCancel(true)} disabled={busy !== null}
                    className="py-2.5 px-5 rounded-full text-sm font-medium text-red-400 hover:bg-red-500/10 transition disabled:opacity-50">
                    Cancel subscription
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Plans */}
      <section aria-labelledby="plans">
        <h2 id="plans" className="text-lg font-semibold text-[#e0e5f9] mb-1">Plans</h2>
        <p className="text-sm text-[#a5abbd] mb-4">
          Card renews automatically. Bank transfer pays for one period at a time.
        </p>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 bg-[#152035] rounded-3xl animate-pulse" />)}
          </div>
        ) : plans.length === 0 ? (
          <p className="text-sm text-[#a5abbd]">No plans are available right now.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const discount = plan.list_amount && plan.list_amount > plan.amount
                ? Math.round((1 - plan.amount / plan.list_amount) * 100)
                : 0
              const current = sub?.plan_id === plan.id && stillPaid && sub.status !== 'cancelled' && sub.status !== 'completed'
              return (
                <div key={plan.id}
                  className={`flex flex-col bg-[#152035] rounded-3xl p-6 border ${current ? 'border-[#ff923e]/40' : 'border-transparent'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#e0e5f9]">{plan.name}</p>
                    {current ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ff923e]/15 text-[#ff923e]">Current</span>
                    ) : discount > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400">
                        <Sparkles className="w-3 h-3" /> Save {discount}%
                      </span>
                    )}
                  </div>
                  {plan.description && <p className="text-sm text-[#a5abbd] mt-1">{plan.description}</p>}

                  <div className="mt-4 flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-bold text-[#e0e5f9] tabular-nums">{formatNaira(plan.amount)}</span>
                    <span className="text-sm text-[#a5abbd]">/ {INTERVAL[plan.interval]}</span>
                  </div>
                  {discount > 0 && (
                    <p className="text-sm text-[#a5abbd]/70 line-through tabular-nums" aria-label={`Was ${formatNaira(plan.list_amount!)}`}>
                      {formatNaira(plan.list_amount!)}
                    </p>
                  )}

                  {plan.features.length > 0 && (
                    <ul className="mt-4 space-y-2 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-[#a5abbd]">
                          <Check className="w-4 h-4 text-[#ff923e] mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-6 flex flex-col gap-2">
                    <button onClick={() => checkout(plan.id, 'card')} disabled={busy !== null || liveCard} className={primaryClass}>
                      {busy === `checkout-${plan.id}-card` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      Subscribe with card
                    </button>
                    <button onClick={() => checkout(plan.id, 'transfer')} disabled={busy !== null || liveCard} className={secondaryClass}>
                      {busy === `checkout-${plan.id}-transfer` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
                      {current && sub?.method === 'transfer' ? 'Pay next period by transfer' : 'Pay by transfer'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {liveCard && (
          <p className="text-xs text-[#a5abbd]/80 mt-3">Cancel your card subscription to switch plan or pay by transfer.</p>
        )}
      </section>

      {/* Payment history */}
      <section aria-labelledby="history">
        <h2 id="history" className="text-lg font-semibold text-[#e0e5f9] mb-4">Past payments</h2>
        {loading ? (
          <div className="h-40 bg-[#152035] rounded-3xl animate-pulse" />
        ) : !data || data.payments.length === 0 ? (
          <div className="text-center py-12 bg-[#152035] rounded-3xl">
            <Receipt className="w-8 h-8 text-[#a5abbd]/40 mx-auto mb-3" />
            <p className="text-sm text-[#a5abbd]">No payments yet</p>
          </div>
        ) : (
          <div className="bg-[#152035] rounded-3xl overflow-x-auto">
            <table className="w-full text-sm min-w-140">
              <thead>
                <tr className="text-left text-xs text-[#a5abbd] uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium text-right">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id} className="border-t border-[#a5abbd]/10">
                    <td className="px-5 py-3 text-[#e0e5f9] whitespace-nowrap">{formatDate(p.paid_at ?? p.created_at)}</td>
                    <td className="px-5 py-3 text-[#a5abbd]">{planName(p.plan_id)}</td>
                    <td className="px-5 py-3 text-[#a5abbd] capitalize">{methodLabel(p.channel)}</td>
                    <td className="px-5 py-3 text-[#e0e5f9] text-right tabular-nums">{formatNaira(p.amount)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'success' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {p.status === 'success' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {p.status === 'success' ? 'Paid' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
