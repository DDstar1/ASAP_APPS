import { supabase } from '@/lib/supabase'

// Payout banks come from Rust (GET /payments/banks, Korapay's list), so the
// code saved in acct_details.bank_code is always one payouts accept.
export type Bank = { name: string; code: string }

let cached: Bank[] | null = null

export async function getBanks(): Promise<Bank[]> {
  if (cached) return cached
  const base = process.env.NEXT_PUBLIC_RUST_API_URL
  if (!base) throw new Error('NEXT_PUBLIC_RUST_API_URL is not set')
  // Vendor signup may load this before there's a session; send the token when there is one
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${base.replace(/\/$/, '')}/payments/banks`, {
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  })
  if (!res.ok) throw new Error(`Could not load banks (${res.status})`)
  const reply = (await res.json()) as Bank[] | { data: Bank[] }
  const banks = Array.isArray(reply) ? reply : reply.data ?? []
  if (banks.length === 0) throw new Error('No banks returned')
  cached = [...banks].sort((a, b) => a.name.localeCompare(b.name))
  return cached
}
