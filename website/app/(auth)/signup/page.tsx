'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Store, Car } from 'lucide-react'
import AuthShell, { authInput, authLabel, authSubmit } from '@/components/AuthShell'
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

  return (
    <AuthShell title="Welcome to ASAP." subtitle="Let's get you started."
      pitch={{ headline: 'Deliveries across your city, sorted.', body: 'Send packages, track every rider live, and get paid on time.' }}>
      <p className="-mt-4 mb-6 text-sm text-[#a5abbd]">
        Already have an account?{' '}
        <Link href="/login" className="text-[#ff923e] font-medium hover:underline">Sign in</Link>
      </p>

      <form onSubmit={handleSignup} className="space-y-5">
        {error && <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="username" className={authLabel}>Username</label>
            <input id="username" type="text" required value={form.username} onChange={(e) => update('username', e.target.value)} placeholder="johndoe" className={authInput} />
          </div>
          <div>
            <label htmlFor="email" className={authLabel}>Email address</label>
            <input id="email" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" className={authInput} />
          </div>
        </div>
        <div>
          <label htmlFor="password" className={authLabel}>Password</label>
          <div className="relative">
            <input id="password" type={showPassword ? 'text' : 'password'} required value={form.password} onChange={(e) => update('password', e.target.value)}
              placeholder="Min. 8 characters" minLength={8} className={`${authInput} pr-12`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a5abbd]/60 hover:text-[#a5abbd] transition">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className={`${authSubmit} sm:w-auto sm:px-10`}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Account'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/10 grid sm:grid-cols-2 gap-3">
        <Link href="/signup/vendor"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-full border border-[#ff923e]/30 text-[#ff923e] text-sm font-semibold hover:bg-[#ff923e]/10 transition">
          <Store className="w-4 h-4" /> Sell on ASAP
        </Link>
        <Link href="/signup/driver"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-full border border-white/15 text-[#a5abbd] text-sm font-semibold hover:bg-white/5 hover:text-[#e0e5f9] transition">
          <Car className="w-4 h-4" /> Become a Driver
        </Link>
      </div>
    </AuthShell>
  )
}
