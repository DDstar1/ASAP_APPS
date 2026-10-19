'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Bell, CheckCircle, Bike, PauseCircle, BarChart3, Wallet, XCircle, ArrowLeftRight, PartyPopper, ChevronRight, ShieldAlert, ShieldCheck, Landmark,
} from 'lucide-react'
import {
  getInvestNotifications, markInvestNotificationsRead, naira,
  type InvestNotification, type InvestNotificationKind,
} from '@/lib/invest'
import { useInvest } from '@/components/invest/InvestContext'

type Data = Record<string, unknown>

const assetHref = (d: Data) => (typeof d.asset_id === 'string' ? `/invest/assets/${d.asset_id}` : '/invest/assets')

const KINDS: Record<InvestNotificationKind, {
  icon: typeof Bell; tone: string; title: string; body: (d: Data) => string; href: (d: Data) => string
}> = {
  slot_secured: { icon: CheckCircle, tone: 'bg-emerald-500/15 text-emerald-600', title: 'Slot secured', href: assetHref,
    body: (d) => `Your payment cleared${d.asset_code ? ` and your slot in ${d.asset_code} is yours` : ''}.` },
  funding_complete: { icon: PartyPopper, tone: 'bg-[#ff923e]/15 text-inv-accent-text', title: 'Fully owned', href: assetHref,
    body: (d) => `Every slot${d.asset_code ? ` in ${d.asset_code}` : ''} is taken. ASAP is now getting the bike ready.` },
  asset_active: { icon: Bike, tone: 'bg-emerald-500/15 text-emerald-600', title: 'On the road', href: assetHref,
    body: (d) => `${d.asset_code ?? 'Your asset'} is now taking trips.` },
  asset_inactive: { icon: PauseCircle, tone: 'bg-amber-500/15 text-amber-700', title: 'Off the road', href: assetHref,
    body: (d) => `${d.asset_code ?? 'Your asset'} is not taking trips for now.` },
  weekly_update: { icon: BarChart3, tone: 'bg-sky-500/15 text-sky-700', title: 'Weekly update', href: () => '/invest/earnings',
    body: (d) => typeof d.amount === 'number' ? `You earned ${naira(d.amount, 2)} last week.` : 'Your weekly earnings are in.' },
  withdrawal_paid: { icon: Wallet, tone: 'bg-emerald-500/15 text-emerald-600', title: 'Withdrawal paid', href: () => '/invest/earnings',
    body: (d) => typeof d.amount === 'number' ? `${naira(d.amount, 2)} was sent to your bank account.` : 'Your withdrawal was sent to your bank account.' },
  withdrawal_failed: { icon: XCircle, tone: 'bg-red-500/15 text-red-600', title: 'Withdrawal failed', href: () => '/invest/earnings',
    body: (d) => `Your withdrawal could not be paid${d.reason ? `: ${d.reason}` : ''}. The amount is back in your balance.` },
  transfer_approved: { icon: ArrowLeftRight, tone: 'bg-emerald-500/15 text-emerald-600', title: 'Transfer approved', href: assetHref,
    body: () => 'A slot transfer you are part of was approved.' },
  transfer_rejected: { icon: ArrowLeftRight, tone: 'bg-red-500/15 text-red-600', title: 'Transfer declined', href: assetHref,
    body: (d) => `A slot transfer you are part of was declined${d.note ? `: ${d.note}` : ''}.` },
  pin_locked: { icon: ShieldAlert, tone: 'bg-red-500/15 text-red-600', title: 'PIN locked', href: () => '/invest/settings',
    body: (d) => `Your PIN was entered wrongly ${d.attempts ?? 5} times and is locked${typeof d.locked_until === 'string'
      ? ` until ${new Date(d.locked_until).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}` : ' for 30 minutes'}. If this wasn’t you, change your PIN now.` },
  pin_changed: { icon: ShieldCheck, tone: 'bg-amber-500/15 text-amber-700', title: 'PIN changed', href: () => '/invest/settings',
    body: () => 'Your withdrawal PIN was changed. If this wasn’t you, contact ASAP support now.' },
  bank_details_changed: { icon: Landmark, tone: 'bg-amber-500/15 text-amber-700', title: 'Bank details changed', href: () => '/invest/settings',
    body: (d) => `Withdrawals now go to the account ending ${d.account_ending ?? '••••'}. If this wasn’t you, contact ASAP support now.` },
}

export default function NotificationsPage() {
  const { userId, refreshUnread } = useInvest()
  const [items, setItems] = useState<InvestNotification[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getInvestNotifications(userId).then(({ data }) => {
      if (cancelled) return
      const rows = (data ?? []) as InvestNotification[]
      setItems(rows)
      const unread = rows.filter((n) => !n.read_at).map((n) => n.id)
      if (unread.length > 0) markInvestNotificationsRead(unread).then(() => refreshUnread())
    })
    return () => { cancelled = true }
  }, [userId, refreshUnread])

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-inv-text">Notifications</h1>

      {items === null ? (
        <div className="h-64 rounded-3xl bg-inv-surface border border-inv-line animate-pulse" />
      ) : items.length === 0 ? (
        <div className="rounded-3xl bg-inv-surface border border-inv-line p-12 text-center">
          <Bell className="w-10 h-10 text-inv-muted/40 mx-auto mb-3" />
          <p className="text-inv-muted">No notifications yet.</p>
        </div>
      ) : (
        <ul className="rounded-3xl bg-inv-surface border border-inv-line divide-y divide-inv-line overflow-hidden">
          {items.map((n) => {
            const kind = KINDS[n.kind]
            if (!kind) return null
            const data = n.data ?? {}
            return (
              <li key={n.id}>
                <Link href={kind.href(data)}
                  className={`group flex items-start gap-4 px-6 py-4 hover:bg-inv-soft/60 transition ${n.read_at ? '' : 'bg-[#ff923e]/5'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kind.tone}`}>
                    <kind.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold text-inv-text">{kind.title}</p>
                      <time className="text-xs text-inv-muted shrink-0">
                        {new Date(n.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                      </time>
                    </div>
                    <p className="text-sm text-inv-muted mt-0.5">{kind.body(data)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-inv-muted mt-3 shrink-0 group-hover:translate-x-0.5 transition" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
