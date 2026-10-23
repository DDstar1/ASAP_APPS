'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import type { Envelope } from '@/lib/admin'

type State<T> = { key: string; reply: Envelope<T> | null; error: string }

// Loads a dashboard endpoint and polls it every refresh_secs. Polling stops when Rust sends
// null (the period is wholly in the past) and pauses while the tab is hidden. A new key
// (period, sort, metric…) shows the loading state until its first reply.
export function useDashboard<T>(load: () => Promise<Envelope<T>>, key: string) {
  const [state, setState] = useState<State<T>>({ key, reply: null, error: '' })
  const fetchLatest = useEffectEvent(() => load())

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function tick() {
      if (document.hidden) { timer = setTimeout(tick, 5000); return }
      let refresh: number | null = null
      try {
        const reply = await fetchLatest()
        if (cancelled) return
        setState({ key, reply, error: '' })
        refresh = reply.refresh_secs
      } catch (e) {
        if (cancelled) return
        const error = e instanceof Error ? e.message : 'Could not load this data.'
        setState((s) => ({ key, reply: s.key === key ? s.reply : null, error }))
      }
      if (!cancelled && refresh) timer = setTimeout(tick, refresh * 1000)
    }
    tick()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [key])

  async function reload() {
    try {
      setState({ key, reply: await load(), error: '' })
    } catch (e) {
      setState((s) => ({ ...s, error: e instanceof Error ? e.message : 'Could not load this data.' }))
    }
  }

  const current = state.key === key
  return { data: current ? state.reply?.data ?? null : null, reply: current ? state.reply : null, error: current ? state.error : '', reload }
}
