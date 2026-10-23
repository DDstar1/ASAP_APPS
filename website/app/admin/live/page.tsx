'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getLive, count, label } from '@/lib/admin'
import { useDashboard } from '@/components/admin/useDashboard'
import { Card, ErrorNote, Freshness, Loading, PageTitle, Rows, Stat } from '@/components/admin/ui'

// Right now, independent of the period picker. Rust refreshes this every 15s.
export default function LivePage() {
  const live = useDashboard(getLive, 'live')
  const d = live.data

  const queues = d ? [
    { label: 'Disputes to review', n: d.queues.disputes, href: '/admin/disputes' },
    { label: 'Dispute refunds failed', n: d.queues.dispute_refunds_failed, href: '/admin/disputes', bad: true },
    { label: 'Driver applications', n: d.queues.applications, href: '/admin/applications' },
    { label: 'Slot transfers', n: d.queues.transfers },
    { label: 'Owner withdrawals', n: d.queues.withdrawals },
    { label: 'Open slot purchases', n: d.queues.purchases_open },
  ] : []

  return (
    <div>
      <PageTitle title="Live">
        <Freshness reply={live.reply} onRefresh={live.reload} />
      </PageTitle>

      {live.error && <ErrorNote message={live.error} />}

      {!d ? <Loading /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Drivers available" value={count(d.drivers.available)} />
            <Stat label="Drivers on a trip" value={count(d.drivers.busy)} />
            <Stat label="Online sessions" value={count(d.online_sessions)} sub={`${count(d.drivers.offline)} drivers offline`} />
            <Stat label="Stale location" value={count(d.drivers.location_stale)} sub="Online, no location for 10+ min"
              tone={d.drivers.location_stale > 0 ? 'warn' : undefined} />
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
            <Card title="Active orders">
              {Object.keys(d.orders).length === 0
                ? <p className="text-sm text-inv-muted">No orders in progress.</p>
                : <Rows rows={Object.entries(d.orders).map(([k, v]) => [label(k), count(v)])} />}
            </Card>

            <Card title="Returns and payouts">
              <Rows rows={[
                ['Packages being returned', count(d.returning)],
                ['Payouts awaiting confirmation', count(d.payouts.awaiting)],
                ['Payouts failed', count(d.payouts.failed)],
              ]} />
            </Card>

            <Card title="Needs attention">
              <ul className="divide-y divide-inv-line">
                {queues.map((q) => {
                  const body = (
                    <>
                      <span className="text-sm text-inv-muted">{q.label}</span>
                      <span className="flex items-center gap-2">
                        <span className={`min-w-7 h-7 px-2 rounded-full text-sm font-bold flex items-center justify-center tabular-nums ${
                          q.n === 0 ? 'bg-inv-soft text-inv-muted' : q.bad ? 'bg-red-500/15 text-red-600' : 'bg-[#ff923e]/15 text-inv-accent-text'}`}>
                          {count(q.n)}
                        </span>
                        {q.href && <ArrowRight className="w-4 h-4 text-inv-muted" />}
                      </span>
                    </>
                  )
                  return (
                    <li key={q.label}>
                      {q.href
                        ? <Link href={q.href} className="flex items-center justify-between gap-4 py-2.5 -mx-2 px-2 rounded-xl hover:bg-inv-soft/60 transition">{body}</Link>
                        : <div className="flex items-center justify-between gap-4 py-2.5">{body}</div>}
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
