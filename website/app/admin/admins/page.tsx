'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Crown, Trash2 } from 'lucide-react'
import { shortDate } from '@/lib/invest'
import { getAdmins, grantAdmin, revokeAdmin, type AdminEntry } from '@/lib/admin'
import { useAdmin } from '@/components/admin/AdminContext'
import { Card, ErrorNote, Loading, PageTitle } from '@/components/admin/ui'

// Any admin can see the list; only the superior can add or remove (Rust enforces both)
export default function AdminsPage() {
  const { me } = useAdmin()
  const superior = me.role === 'superior'
  const [admins, setAdmins] = useState<AdminEntry[] | null>(null)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setAdmins((await getAdmins()).admins)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load admins.')
      setAdmins([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy('add')
    setError('')
    try {
      await grantAdmin(email.trim())
      setEmail('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that admin.')
    } finally {
      setBusy(null)
    }
  }

  async function remove(userId: string) {
    setBusy(userId)
    setError('')
    try {
      await revokeAdmin(userId)
      setConfirming(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that admin.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle title="Admins" />

      {superior && (
        <Card title="Add an admin" className="mb-6">
          <form onSubmit={add} className="flex flex-col sm:flex-row gap-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="their ASAP account email"
              aria-label="Email" className="flex-1 px-4 py-3 rounded-xl border border-inv-line bg-inv-surface text-inv-text placeholder:text-inv-muted/60" />
            <button type="submit" disabled={busy === 'add'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white font-semibold cursor-pointer disabled:opacity-50">
              {busy === 'add' && <Loader2 className="w-4 h-4 animate-spin" />} Add admin
            </button>
          </form>
          <p className="text-xs text-inv-muted mt-3">They need an ASAP account first. They sign in at /admin with it.</p>
        </Card>
      )}

      {error && <div className="mb-6"><ErrorNote message={error} /></div>}

      {admins === null ? <Loading /> : (
        <ul className="rounded-3xl bg-inv-surface border border-inv-line divide-y divide-inv-line overflow-hidden">
          {admins.map((a) => (
            <li key={a.user_id} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-inv-text truncate flex items-center gap-2">
                  {a.email}
                  {a.user_id === me.user_id && <span className="text-xs font-normal text-inv-muted">(you)</span>}
                </p>
                <p className="text-xs text-inv-muted mt-0.5">Added {shortDate(a.granted_at)}</p>
              </div>
              {a.role === 'superior' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ff923e]/15 text-inv-accent-text text-xs font-semibold">
                  <Crown className="w-3.5 h-3.5" /> Superior
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-inv-soft text-inv-muted text-xs font-semibold">Admin</span>
              )}
              {superior && a.role !== 'superior' && (
                confirming === a.user_id ? (
                  <div className="flex gap-1">
                    <button onClick={() => remove(a.user_id)} disabled={busy === a.user_id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-50">
                      {busy === a.user_id && <Loader2 className="w-3 h-3 animate-spin" />} Remove
                    </button>
                    <button onClick={() => setConfirming(null)} className="px-3 py-1.5 rounded-full text-xs font-semibold text-inv-muted hover:bg-inv-soft cursor-pointer">
                      Keep
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirming(a.user_id)} aria-label={`Remove ${a.email}`}
                    className="p-2 rounded-full text-inv-muted hover:text-red-600 hover:bg-red-500/10 cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
