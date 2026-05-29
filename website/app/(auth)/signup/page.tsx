'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Eye, EyeOff, Loader2, Store, Car } from 'lucide-react'
import { signUp, insertAppUser } from '@/lib/supabase_queries'

export default function Signup() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '' })

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSignup(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await signUp(form.email, form.password)
    if (authError || !authData.user) {
      setError(authError?.message ?? 'Sign up failed.')
      setLoading(false)
      return
    }

    const { error: profileError } = await insertAppUser(authData.user.id, form.username)
    if (profileError) {
      setError('Account created but profile setup failed: ' + profileError.message)
      setLoading(false)
      return
    }

    router.push('/home')
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-[#a5abbd]/15 bg-[#152035] text-[#e0e5f9] placeholder:text-[#a5abbd]/50 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition'

  return (
    <div className="min-h-screen bg-[#080e1c] flex items-center justify-center px-4 py-12">
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
          <h1 className="text-3xl font-bold text-[#e0e5f9]">Create Account</h1>
          <p className="text-[#a5abbd] mt-2">Get started with ASAP</p>
        </div>

        <div className="bg-[#1c2a42] rounded-3xl p-8 shadow-[0_12px_32px_rgba(8,14,28,0.5)]">
          <form onSubmit={handleSignup} className="space-y-5">
            {error && <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Username</label>
              <input type="text" required value={form.username} onChange={(e) => update('username', e.target.value)} placeholder="johndoe" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Email address</label>
              <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={form.password} onChange={(e) => update('password', e.target.value)}
                  placeholder="Min. 8 characters" minLength={8} className={`${inputClass} pr-12`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a5abbd]/60 hover:text-[#a5abbd] transition">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold hover:shadow-[0_12px_32px_rgba(255,146,62,0.25)] hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#a5abbd]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#ff923e] font-medium hover:underline">Sign in</Link>
          </p>

          <div className="mt-6 pt-6 border-t border-[#a5abbd]/10">
            <Link href="/signup/vendor"
              className="flex items-center justify-center gap-3 w-full py-3 px-6 rounded-full border border-[#ff923e]/30 text-[#ff923e] text-sm font-semibold hover:bg-[#ff923e]/10 transition">
              <Store className="w-4 h-4" />
              Want to sell on ASAP? Create a vendor account
            </Link>
          </div>

          <div className="mt-3">
            <Link href="/signup/driver"
              className="flex items-center justify-center gap-3 w-full py-3 px-6 rounded-full border border-[#a5abbd]/20 text-[#a5abbd] text-sm font-semibold hover:bg-[#a5abbd]/10 hover:text-[#e0e5f9] transition">
              <Car className="w-4 h-4" />
              Become a Driver
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
