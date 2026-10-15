// TEMPORARY HOME: Zazu billing lives in the website until it moves to an
// application server (priority once the current work is done).
//
// Server-only: imported by app/api/billing/* route handlers, never by a page.
// Holds the Paystack secret and the billing server secret; both are plain
// (non NEXT_PUBLIC_) env vars, so Next never bundles them for the browser.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function secret(name: 'PAYSTACK_SECRET_KEY' | 'BILLING_SERVER_SECRET') {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

export class BillingError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof BillingError) return Response.json({ error: err.message }, { status: err.status })
  console.error('billing:', err)
  return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

// The signed-in vendor, from the session cookie; RLS applies
async function userClient() {
  const store = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      // Route handlers can't always refresh cookies; proxy.ts does that on page loads
      setAll: (toSet) => {
        try { toSet.forEach(({ name, value, options }) => store.set(name, value, options)) } catch {}
      },
    },
  })
}

// No session: the billing RPCs check BILLING_SERVER_SECRET instead
const serverClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// The signed-in user and one of their stores; RLS hides stores they don't own
export async function requireVendor(vendorId: unknown) {
  if (typeof vendorId !== 'number' || !Number.isInteger(vendorId)) throw new BillingError('Pick a store.')
  const supabase = await userClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new BillingError('Please sign in again.', 401)

  const { data: vendor } = await supabase
    .from('telegram_vendor')
    .select('id, email')
    .eq('id', vendorId)
    .maybeSingle()
  if (!vendor) throw new BillingError('Store not found.', 404)

  return { supabase, user, vendor: vendor as { id: number; email: string } }
}

export type PaystackCodes = { subscription_code: string | null; email_token: string | null; customer_code: string | null }

export async function paystackCodes(vendorId: number): Promise<PaystackCodes | null> {
  const { data, error } = await serverClient.rpc('billing_paystack_codes', {
    p_secret: secret('BILLING_SERVER_SECRET'),
    p_vendor: vendorId,
  })
  if (error) throw error
  return (data as PaystackCodes[] | null)?.[0] ?? null
}

// Records one Paystack event; safe to repeat
export async function applyEvent(event: string, data: unknown) {
  const { error } = await serverClient.rpc('billing_apply_event', {
    p_secret: secret('BILLING_SERVER_SECRET'),
    p_event: event,
    p_data: data,
  })
  if (error) throw error
}

// ─── Paystack ─────────────────────────────────────────────────────────────────

export async function paystack<T>(path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${secret('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null
  if (!res.ok || !json?.status) {
    console.error(`paystack ${path}:`, res.status, json?.message)
    throw new BillingError('Paystack could not complete that. Please try again.', 502)
  }
  return json.data as T
}

// Paystack signs the raw body with the secret key (HMAC SHA512)
export function validSignature(rawBody: string, signature: string | null) {
  if (!signature) return false
  const expected = createHmac('sha512', secret('PAYSTACK_SECRET_KEY')).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
