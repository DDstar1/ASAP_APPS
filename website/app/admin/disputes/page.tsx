'use client'

import { useEffect, useState } from 'react'
import { Loader2, Scale, CheckCircle } from 'lucide-react'
import { naira, shortDate } from '@/lib/invest'
import { getDisputes, reviewDispute, label, type Dispute, type DisputeStatus } from '@/lib/admin'
import { ErrorNote, Loading, PageTitle, Pills } from '@/components/admin/ui'

// Same wording the customer app shows (customer_app/components/ReviewCard.tsx)
const REASON_LABEL: Record<string, string> = {
  dimensions_exceeded: 'Package too big',
  weight_exceeded: 'Package too heavy',
  prohibited_contents: 'Prohibited item',
  package_not_found: 'No package at pickup',
  wrong_location: 'Wrong pickup location',
}

// A driver who raises many disputes may be using them to skip orders
const MANY_DISPUTES = 3

export default function DisputesPage() {
  const [status, setStatus] = useState<DisputeStatus>('pending')
  const [reloads, setReloads] = useState(0)
  // Kept with the filter it was loaded for, so a change of filter shows loading until it answers
  const [result, setResult] = useState<{ key: string; items: Dispute[]; error: string } | null>(null)
  const key = `${status}|${reloads}`
  const items = result?.key === key ? result.items : null
  const error = result?.key === key ? result.error : ''

  useEffect(() => {
    let cancelled = false
    getDisputes(status)
      .then(({ disputes }) => { if (!cancelled) setResult({ key, items: disputes, error: '' }) })
      .catch((e) => {
        if (!cancelled) setResult({ key, items: [], error: e instanceof Error ? e.message : 'Could not load disputes.' })
      })
    return () => { cancelled = true }
  }, [key, status])

  const load = () => setReloads((n) => n + 1)

  return (
    <div>
      <PageTitle title="Package disputes" />

      <div className="mb-6">
        <Pills label="Status" value={status} onChange={setStatus} options={[
          { value: 'pending', label: 'To review' },
          { value: 'upheld', label: 'Upheld' },
          { value: 'rejected', label: 'Driver at fault' },
        ]} />
      </div>

      {error && <ErrorNote message={error} />}

      {items === null ? <Loading /> : items.length === 0 ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
          <Scale className="w-10 h-10 text-inv-muted mb-3" />
          <p className="font-semibold text-inv-text">{status === 'pending' ? 'Nothing to review' : 'No disputes here'}</p>
        </div>
      ) : (
        <ul className="grid lg:grid-cols-2 gap-6">
          {items.map((d) => <DisputeCard key={d.id} dispute={d} onReviewed={load} />)}
        </ul>
      )}
    </div>
  )
}

function DisputeCard({ dispute: d, onReviewed }: { dispute: Dispute; onReviewed: () => void }) {
  const [atFault, setAtFault] = useState<boolean | null>(null)
  const [penalty, setPenalty] = useState('0')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<string | null>(null)

  async function submit() {
    if (atFault === null) return
    const penaltyNaira = Number(penalty)
    if (atFault && (!Number.isFinite(penaltyNaira) || penaltyNaira < 0)) { setError('Enter a penalty in naira, or 0 for a warning.'); return }
    setBusy(true)
    setError('')
    try {
      const r = await reviewDispute(d.id, atFault, atFault ? Math.round(penaltyNaira * 100) : null, note.trim() || undefined)
      setResult(r.refund_amount > 0
        ? `Reviewed. ${naira(r.refund_amount)} refund ${r.refund_status === 'sent' ? 'sent' : r.refund_status === 'failed' ? 'failed, it will be retried' : 'on its way'}.`
        : 'Reviewed. No refund was due.')
      setTimeout(onReviewed, 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t go through.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-3xl bg-inv-surface border border-inv-line overflow-hidden flex flex-col">
      <a href={d.photo_url} target="_blank" rel="noopener noreferrer" className="block bg-inv-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={d.photo_url} alt={`Photo the driver took for ${d.order_code}`} className="w-full aspect-video object-cover" />
      </a>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-inv-text">{REASON_LABEL[d.reason] ?? label(d.reason)}</p>
            <p className="text-sm text-inv-muted font-mono">{d.order_code} · {label(d.source)} · {shortDate(d.created_at)}</p>
          </div>
          {d.refund_status && d.status !== 'pending' && (
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
              d.refund_status === 'failed' ? 'bg-red-500/15 text-red-600' : 'bg-inv-soft text-inv-muted'}`}>
              Refund {d.refund_status}
            </span>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-inv-muted">Driver</dt>
          <dd className="text-inv-text">
            {d.driver_name}
            <span className={`ml-2 text-xs ${d.driver_disputes >= MANY_DISPUTES ? 'text-red-600 font-semibold' : 'text-inv-muted'}`}>
              {d.driver_disputes} {d.driver_disputes === 1 ? 'dispute' : 'disputes'} in total
            </span>
          </dd>
          <dt className="text-inv-muted">Package</dt>
          <dd className="text-inv-text">{[d.package_type, d.package_description].filter(Boolean).join(' · ') || '—'}</dd>
          {d.driver_note && (<><dt className="text-inv-muted">Driver said</dt><dd className="text-inv-text">{d.driver_note}</dd></>)}
        </dl>

        {d.status === 'pending' && (
          <div className="mt-auto pt-5">
            <div className="pt-5 border-t border-inv-line space-y-3">
              {result ? (
                <p role="status" className="flex items-start gap-2 text-sm text-emerald-700">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />{result}
                </p>
              ) : (
                <>
                  <div role="radiogroup" aria-label="Decision" className="grid sm:grid-cols-2 gap-2">
                    {[
                      { v: false, title: 'Driver was right', body: 'Driver gets their share, the rest is refunded' },
                      { v: true, title: 'Driver at fault', body: 'Customer gets a full refund' },
                    ].map((o) => (
                      <button key={o.title} role="radio" aria-checked={atFault === o.v} onClick={() => setAtFault(o.v)}
                        className={`text-left rounded-2xl border px-4 py-3 transition cursor-pointer ${
                          atFault === o.v ? 'border-[#ff923e] bg-[#ff923e]/10' : 'border-inv-line hover:bg-inv-soft'}`}>
                        <p className="text-sm font-semibold text-inv-text">{o.title}</p>
                        <p className="text-xs text-inv-muted mt-0.5">{o.body}</p>
                      </button>
                    ))}
                  </div>
                  {atFault && (
                    <label className="block text-sm text-inv-muted">Penalty for the driver (₦, 0 for a warning)
                      <input type="number" min={0} inputMode="decimal" value={penalty} onChange={(e) => setPenalty(e.target.value)}
                        className="block w-full mt-1 px-4 py-3 rounded-xl border border-inv-line bg-inv-surface text-inv-text" />
                    </label>
                  )}
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note (optional)" aria-label="Note"
                    className="w-full px-4 py-3 rounded-xl border border-inv-line bg-inv-surface text-inv-text placeholder:text-inv-muted/60" />
                  {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                  <button onClick={submit} disabled={busy || atFault === null}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white text-sm font-semibold cursor-pointer disabled:opacity-40">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit review
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </li>
  )
}
