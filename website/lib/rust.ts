import { supabase } from '@/lib/supabase'

export class RustError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

// Used until NEXT_PUBLIC_RUST_API_URL is set in Vercel
const DEFAULT_RUST_API_URL = 'https://ride-hailing-77al.onrender.com'

// Trimmed, so stray spaces pasted into an env value can't break every request
export function rustBase(): string {
  const base = process.env.NEXT_PUBLIC_RUST_API_URL?.trim() || DEFAULT_RUST_API_URL
  return base.replace(/\/$/, '')
}

export async function rust<T>(path: string, body?: unknown, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST'): Promise<T> {
  const base = rustBase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in again')
  const res = await fetch(`${base}${path}`, {
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
