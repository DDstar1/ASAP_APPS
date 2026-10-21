'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Newspaper } from 'lucide-react'
import { getInvestMessages, markInvestMessageRead, shortDate, type InvestMessage } from '@/lib/invest'
import { useInvest } from '@/components/invest/InvestContext'
import EmptyState from '@/components/invest/EmptyState'

export default function NewsPage() {
  const { userId, refreshUnread } = useInvest()
  const [items, setItems] = useState<InvestMessage[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    getInvestMessages(userId).then(({ data }) => { if (!cancelled) setItems(data) })
    return () => { cancelled = true }
  }, [userId])

  function toggle(m: InvestMessage) {
    setOpen(open === m.id ? null : m.id)
    if (!m.read) {
      setItems((list) => list?.map((x) => (x.id === m.id ? { ...x, read: true } : x)) ?? null)
      markInvestMessageRead(m.id, userId).then(() => refreshUnread())
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-inv-text">News</h1>

      {items === null ? (
        <div className="h-64 rounded-3xl bg-inv-surface border border-inv-line animate-pulse" />
      ) : items.length === 0 ? (
        <EmptyState icon={Newspaper} title="No news yet" body="Updates from ASAP for owners will show up here." />
      ) : (
        <ul className="space-y-3">
          {items.map((m) => {
            const expanded = open === m.id
            return (
              <li key={m.id} className="rounded-3xl bg-inv-surface border border-inv-line overflow-hidden">
                <button onClick={() => toggle(m)} aria-expanded={expanded}
                  className="w-full flex items-start justify-between gap-4 px-6 py-5 text-left cursor-pointer hover:bg-inv-soft/50 transition">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {!m.read && <span className="w-2 h-2 rounded-full bg-[#ff923e] shrink-0" aria-label="Unread" />}
                      <p className={`text-inv-text ${m.read ? 'font-medium' : 'font-bold'}`}>{m.title}</p>
                    </div>
                    <p className="text-xs text-inv-muted mt-1">{shortDate(m.published_at)}</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-inv-muted shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && (
                  <div className="px-6 pb-6 text-sm text-inv-text leading-relaxed whitespace-pre-line">{m.body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
