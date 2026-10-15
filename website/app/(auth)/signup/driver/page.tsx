'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, Eye, EyeOff, Loader2, ChevronRight } from 'lucide-react'
import { signUp, insertAppUser } from '@/lib/supabase_queries'
import GetRiderApp from '@/components/GetRiderApp'

// One login per person: this creates the ordinary ASAP account only. The
// driver profile (back_drivers) is created by the rider app after sign-in.
export default function DriverSignup() {
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [account, setAccount] = useState({ username: '', email: '', password: '' })

  function updateAccount(field: keyof typeof account, value: string) {
    setAccount((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await signUp(account.email, account.password)
    if (authError || !authData.user) { setError(authError?.message ?? 'Sign up failed.'); setLoading(false); return }

    const { error: profileError } = await insertAppUser(authData.user.id, account.username)
    if (profileError) { setError('Account created but profile setup failed: ' + profileError.message); setLoading(false); return }

    setDone(true)
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-[#a5abbd]/15 bg-[#152035] text-[#e0e5f9] placeholder:text-[#a5abbd]/50 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition'

  return (
    <div className="min-h-screen bg-[#080e1c] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="bg-linear-to-br from-[#ff923e] to-[#c46018] p-2 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-linear-to-r from-[#ff923e] to-[#c46018] bg-clip-text text-transparent">
              ASAP.
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-[#e0e5f9]">Become a Driver</h1>
          <p className="text-[#a5abbd] mt-2">Join the ASAP driver network</p>
        </div>

        <div className="bg-[#1c2a42] rounded-3xl p-8 shadow-[0_12px_32px_rgba(8,14,28,0.5)]">
          {error && <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm mb-5">{error}</div>}

          {done ? (
            <GetRiderApp />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Username</label>
                <input type="text" required value={account.username} onChange={(e) => updateAccount('username', e.target.value)} placeholder="johndoe" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Email address</label>
                <input type="email" required value={account.email} onChange={(e) => updateAccount('email', e.target.value)} placeholder="you@example.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={account.password}
                    onChange={(e) => updateAccount('password', e.target.value)} placeholder="Min. 8 characters" minLength={8}
                    className={`${inputClass} pr-12`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a5abbd]/60 hover:text-[#a5abbd] transition">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold hover:shadow-[0_12px_32px_rgba(255,146,62,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <>Create Account <ChevronRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {!done && (
            <p className="mt-6 text-center text-sm text-[#a5abbd]">
              Already have an ASAP account?{' '}
              <Link href="/become-driver" className="text-[#ff923e] font-medium hover:underline">Get the rider app</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
