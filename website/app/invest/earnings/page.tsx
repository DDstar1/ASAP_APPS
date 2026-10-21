'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Loader2, CheckCircle } from 'lucide-react'
import {
  getWallet, getEarnings, getWithdrawals, getMyAssets, getTripEarnings, assetType, tripShare, naira, shortDate, isoWeek, weekRange,
  type Wallet, type Earning, type Withdrawal, type WithdrawalStatus, type TripEarning, type InvestAssetWithPlan,
} from '@/lib/invest'
import { ASSET_TYPE_LABEL } from '@/lib/investMedia'
import { useInvest } from '@/components/invest/InvestContext'
import WithdrawModal from '@/components/invest/WithdrawModal'

const PAYOUT_STATUS: Record<WithdrawalStatus, { label: string; tone: string }> = {
  pending: { label: 'Requested', tone: 'bg-amber-500/15 text-amber-700' },
  processing: { label: 'Processing', tone: 'bg-sky-500/15 text-sky-700' },
  paid: { label: 'Paid', tone: 'bg-emerald-500/15 text-emerald-700' },
  failed: { label: 'Failed', tone: 'bg-red-500/15 text-red-600' },
}

type Data = {
  wallet: Wallet
  weeks: { week: string; amount: number }[]
  withdrawals: Withdrawal[]
  assets: Map<string, InvestAssetWithPlan>
}

export default function EarningsPage() {
  const { userId } = useInvest()
  const [data, setData] = useState<Data | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [withdrawing, setWithdrawing] = useState(false)
  const [done, setDone] = useState<number | null>(null)
  const [openWeek, setOpenWeek] = useState<string | null>(null)
  const [trips, setTrips] = useState<Record<string, TripEarning[]>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all([getWallet(userId), getEarnings(userId), getWithdrawals(userId), getMyAssets()]).then(([w, e, p, a]) => {
      if (cancelled) return
      const byWeek = new Map<string, number>()
      for (const row of (e.data ?? []) as Earning[]) byWeek.set(row.week_start, (byWeek.get(row.week_start) ?? 0) + row.amount)
      setData({
        wallet: w.data,
        weeks: [...byWeek].map(([week, amount]) => ({ week, amount })).sort((x, y) => y.week.localeCompare(x.week)),
        withdrawals: (p.data ?? []) as Withdrawal[],
        assets: new Map(a.data.map((asset) => [asset.id, asset])),
      })
    })
    return () => { cancelled = true }
  }, [userId, reloadKey])

  function toggleWeek(week: string) {
    const next = openWeek === week ? null : week
    setOpenWeek(next)
    if (next && !trips[next]) {
      getTripEarnings(userId, next).then(({ data: rows }) =>
        setTrips((t) => ({ ...t, [next]: (rows ?? []) as TripEarning[] })))
    }
  }

  if (data === null) {
    return <div className="h-64 rounded-3xl bg-inv-surface border border-inv-line animate-pulse" />
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-inv-text">Earnings</h1>

      {done !== null && (
        <p role="status" className="flex items-start gap-2 rounded-2xl border px-5 py-4 text-sm bg-emerald-500/10 border-emerald-500/30 text-emerald-700">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          Withdrawal of {naira(done, 2)} requested. It will be paid to your bank account.
        </p>
      )}

      <div className="grid lg:grid-cols-[20rem_minmax(0,1fr)] gap-6 items-start">
      {/* Card-shaped balance: narrow and tall, pinned beside the lists on desktop */}
      <section className="w-full max-w-sm mx-auto lg:mx-0 lg:sticky lg:top-28 min-h-[22rem] flex flex-col rounded-[2rem] bg-linear-to-br from-[#ff923e] to-[#c46018] text-white p-7 shadow-[0_20px_48px_rgba(255,146,62,0.35)]">
        <p className="text-sm text-white/80">Available balance</p>
        <p className="text-4xl font-bold tabular-nums mt-2 break-all">{naira(data.wallet.balance, 2)}</p>
        <dl className="mt-auto pt-8 space-y-3 text-sm tabular-nums">
          <div className="flex justify-between gap-4 border-t border-white/20 pt-3">
            <dt className="text-white/80">Earned</dt>
            <dd className="font-semibold">{naira(data.wallet.earned)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-white/20 pt-3">
            <dt className="text-white/80">Withdrawn</dt>
            <dd className="font-semibold">{naira(data.wallet.withdrawn)}</dd>
          </div>
        </dl>
        <button onClick={() => { setDone(null); setWithdrawing(true) }} disabled={data.wallet.balance <= 0}
          className="mt-6 w-full py-3.5 rounded-full bg-white text-[#b4520c] font-semibold hover:bg-white/90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          Withdraw
        </button>
      </section>

      <div className="space-y-6 min-w-0">
      <section className="rounded-3xl bg-inv-surface border border-inv-line overflow-hidden">
        <h2 className="text-lg font-bold text-inv-text px-6 pt-6 pb-4">Weekly earnings</h2>
        {data.weeks.length === 0 ? (
          <p className="text-sm text-inv-muted px-6 py-14 text-center border-t border-inv-line">Your first weekly earnings will show here.</p>
        ) : (
          <ul className="divide-y divide-inv-line border-t border-inv-line">
            {data.weeks.map((w) => {
              const open = openWeek === w.week
              const rows = trips[w.week]
              return (
                <li key={w.week}>
                  <button onClick={() => toggleWeek(w.week)} aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-inv-soft/60 transition cursor-pointer">
                    <div>
                      <p className="font-semibold text-inv-text">Week {isoWeek(w.week)}</p>
                      <p className="text-xs text-inv-muted mt-0.5">{weekRange(w.week)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-inv-text tabular-nums">{naira(w.amount, 2)}</span>
                      <ChevronDown className={`w-5 h-5 text-inv-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {open && (
                    <div className="bg-inv-soft/50 px-6 py-2">
                      {!rows ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-inv-muted" /></div>
                      ) : rows.length === 0 ? (
                        <p className="text-sm text-inv-muted text-center py-6">No trips recorded for this week.</p>
                      ) : (
                        <ul className="divide-y divide-inv-line">
                          {rows.map((t) => {
                            const asset = data.assets.get(t.asset_id)
                            return (
                              <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                                <div>
                                  <p className="font-bold text-inv-text tabular-nums">{naira(tripShare(t), 2)}</p>
                                  <p className="text-xs text-inv-muted/70 mt-0.5 tabular-nums">Fare {naira(t.fare, 2)}</p>
                                </div>
                                {asset && (
                                  <div className="text-right">
                                    <p className="text-xs text-inv-muted">{ASSET_TYPE_LABEL[assetType(asset)]}</p>
                                    <p className="font-mono text-sm font-semibold text-inv-text mt-0.5">{asset.code}</p>
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-inv-surface border border-inv-line p-6">
        <h2 className="text-lg font-bold text-inv-text mb-4">Withdrawals</h2>
        {data.withdrawals.length === 0 ? (
          <p className="text-sm text-inv-muted py-10 text-center">No withdrawals yet.</p>
        ) : (
          <ul className="divide-y divide-inv-line">
            {data.withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-semibold text-inv-text tabular-nums">{naira(w.amount, 2)}</p>
                  <p className="text-xs text-inv-muted mt-0.5">{shortDate(w.paid_at ?? w.requested_at)}</p>
                  {w.status === 'failed' && w.failure && <p className="text-xs text-red-600 mt-0.5">{w.failure}</p>}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PAYOUT_STATUS[w.status].tone}`}>
                  {PAYOUT_STATUS[w.status].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
      </div>

      {withdrawing && (
        <WithdrawModal balance={data.wallet.balance} onClose={() => setWithdrawing(false)}
          onDone={(amount) => { setWithdrawing(false); setDone(amount); setReloadKey((k) => k + 1) }} />
      )}
    </div>
  )
}
