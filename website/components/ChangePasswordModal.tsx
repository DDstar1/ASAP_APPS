'use client'

import { useState } from 'react'
import { Loader2, X, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { getSession, signInWithPassword, updatePassword } from '@/lib/supabase_queries'

// One Supabase login covers the website and both apps, so this is the
// password for all of them
export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (next.length < 8) { setError('The new password must be at least 8 characters.'); return }
    if (next !== confirm) { setError('The new passwords do not match.'); return }
    if (next === current) { setError('The new password must be different from the current one.'); return }
    setSaving(true)
    setError('')

    // Confirm it's really them before changing the password on an open session
    const { data: { session } } = await getSession()
    const email = session?.user.email
    if (!email) { setError('Your session has expired. Sign in again.'); setSaving(false); return }
    const { error: signInError } = await signInWithPassword(email, current)
    if (signInError) { setError('Your current password is incorrect.'); setSaving(false); return }

    const { error: updateError } = await updatePassword(next)
    setSaving(false)
    if (updateError) { setError(updateError.message || 'Could not change the password. Try again.'); return }
    setDone(true)
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-ui-line bg-ui-field text-ui-text placeholder:text-ui-muted/60 focus:outline-none focus:border-[#ff923e]/50 focus:ring-2 focus:ring-[#ff923e]/25 transition text-sm'

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain bg-ui-surface border border-ui-line rounded-3xl p-6 shadow-[0_12px_32px_rgba(8,14,28,0.35)]">
        <div className="flex items-center justify-between mb-5">
          <h2 id="change-password-title" className="text-lg font-bold text-ui-text">Change password</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-ui-muted hover:bg-ui-field hover:text-ui-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-5">
            <div className="flex items-start gap-2 bg-emerald-500/10 text-ui-up px-4 py-3 rounded-xl text-sm">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Password changed. Use it next time you sign in, on the website and in the ASAP apps.
            </div>
            <button onClick={onClose} className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full text-sm font-semibold">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 text-ui-down px-4 py-3 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-ui-text mb-1.5">Current password</label>
              <input id="current-password" type={show ? 'text' : 'password'} required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-ui-text mb-1.5">New password</label>
              <input id="new-password" type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-ui-text mb-1.5">Confirm new password</label>
              <input id="confirm-password" type={show ? 'text' : 'password'} required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
            </div>
            <button type="button" onClick={() => setShow((s) => !s)} className="flex items-center gap-2 text-xs text-ui-muted hover:text-ui-text">
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {show ? 'Hide passwords' : 'Show passwords'}
            </button>
            <button type="submit" disabled={saving} className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
