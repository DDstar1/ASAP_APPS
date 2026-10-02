'use client'

// Public account-deletion page (Google Play "Delete account URL").
// Uses the same delete_own_account() RPC as the in-app button, which refuses
// while the user has a delivery in progress.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function DeleteAccount() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
      setChecking(false)
    })
  }, [])

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    setDeleting(true)
    setError('')

    const { error: rpcError } = await supabase.rpc('delete_own_account')
    if (rpcError) {
      setError(
        rpcError.message === 'ACTIVE_DELIVERY'
          ? 'You have a delivery in progress. You can delete your account once it has been delivered.'
          : 'Something went wrong. Please try again or contact support.'
      )
      setDeleting(false)
      return
    }

    await supabase.auth.signOut({ scope: 'local' })
    setDeleted(true)
    setDeleting(false)
  }

  return (
    <div className="min-h-screen bg-[#080e1c] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="bg-linear-to-br from-[#ff923e] to-[#c46018] p-2 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-linear-to-r from-[#ff923e] to-[#c46018] bg-clip-text text-transparent">
              ASAP.
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-[#e0e5f9]">Delete Account</h1>
          <p className="text-[#a5abbd] mt-2">ASAP customer &amp; rider apps</p>
        </div>

        <div className="bg-[#1c2a42] rounded-3xl p-8 shadow-[0_12px_32px_rgba(8,14,28,0.5)] space-y-5">
          <div className="text-sm text-[#a5abbd] space-y-2">
            <p>Deleting your account permanently removes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your profile, email, phone number and photo</li>
              <li>Saved locations and settings</li>
              <li>Delivery orders, messages and package images</li>
              <li>Rider status and payout details</li>
            </ul>
            <p>
              Deletion is immediate and cannot be undone. It isn&apos;t available while a delivery
              you&apos;re part of is in progress. You can also delete your account from the
              profile screen in the app.
            </p>
          </div>

          {checking ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-[#ff923e]" />
            </div>
          ) : deleted ? (
            <div className="bg-emerald-500/10 text-emerald-400 px-4 py-3 rounded-xl text-sm">
              Your account and data have been deleted.
            </div>
          ) : !email ? (
            <button
              onClick={() => router.push('/login?next=/delete-account')}
              className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold transition-all"
            >
              Sign in to continue
            </button>
          ) : (
            <form onSubmit={handleDelete} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
              )}
              <p className="text-sm text-[#e0e5f9]">
                Signed in as <span className="font-semibold">{email}</span>. Type{' '}
                <span className="font-mono font-semibold">DELETE</span> to confirm.
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoCapitalize="characters"
                className="w-full px-4 py-3 rounded-xl border border-[#a5abbd]/15 bg-[#152035] text-[#e0e5f9] placeholder:text-[#a5abbd]/50 focus:outline-none focus:border-red-400/40 focus:ring-1 focus:ring-red-400/40 transition"
              />
              <button
                type="submit"
                disabled={deleting || confirmText !== 'DELETE'}
                className="w-full py-3 px-6 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Permanently delete my account</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
