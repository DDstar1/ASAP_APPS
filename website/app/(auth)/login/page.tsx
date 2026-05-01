'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Package, Eye, EyeOff, Loader2 } from 'lucide-react'
import { signInWithPassword, getVendorIdByEmail } from '@/lib/supabase_queries'

export default function Login() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await signInWithPassword(email, password)
    if (authError || !authData.user) {
      setError(authError?.message ?? 'Sign in failed.')
      setLoading(false)
      return
    }

    const next = searchParams.get('next')
    if (next) { router.push(next); return }

    const { data: vendor } = await getVendorIdByEmail(authData.user.email!)
    router.push(vendor ? '/vendor/dashboard' : '/home')
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
          <h1 className="text-3xl font-bold text-[#e0e5f9]">Sign In</h1>
          <p className="text-[#a5abbd] mt-2">Welcome back</p>
        </div>

        <div className="bg-[#1c2a42] rounded-3xl p-8 shadow-[0_12px_32px_rgba(8,14,28,0.5)]">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Email address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-[#a5abbd]/15 bg-[#152035] text-[#e0e5f9] placeholder:text-[#a5abbd]/50 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-[#a5abbd]/15 bg-[#152035] text-[#e0e5f9] placeholder:text-[#a5abbd]/50 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a5abbd]/60 hover:text-[#a5abbd] transition">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold hover:shadow-[0_12px_32px_rgba(255,146,62,0.25)] hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[#a5abbd]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#ff923e] font-medium hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
