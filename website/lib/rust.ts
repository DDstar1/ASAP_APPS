import { supabase } from '@/lib/supabase'

export class RustError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export async function rust<T>(path: string, body?: unknown, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST'): Promise<T> {
  const base = process.env.NEXT_PUBLIC_RUST_API_URL
  if (!base) throw new Error('NEXT_PUBLIC_RUST_API_URL is not set')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in again')
  const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  // Errors are { error } JSON, but a proxy in front may answer in plain text
  const text = await res.text()
  let reply: unknown = null
  try { reply = text ? JSON.parse(text) : null } catch { reply = null }
  if (!res.ok) {
    const message = (reply as { error?: string } | null)?.error ?? (text || `Request failed (${res.status})`)
    throw new RustError(message, res.status)
  }
  return reply as T
}
