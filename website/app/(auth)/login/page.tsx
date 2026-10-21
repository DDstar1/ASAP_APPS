'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import AuthShell, { authInput, authLabel, authSubmit } from '@/components/AuthShell'
import { signInWithPassword } from '@/lib/supabase_queries'
import { landingPath, explicitNext } from '@/lib/landing'

function LoginForm() {
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

    router.push(explicitNext(searchParams.get('next')) ?? await landingPath(authData.user.id))
  }

  return (
    <>
      <form onSubmit={handleLogin} className="space-y-5">
        {error && (
          <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}
        <div>
          <label htmlFor="email" className={authLabel}>Email address</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            className={authInput} />
        </div>
        <div>
          <label htmlFor="password" className={authLabel}>Password</label>
          <div className="relative">
            <input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className={`${authInput} pr-12`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a5abbd]/60 hover:text-[#a5abbd] transition">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className={authSubmit}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
        </button>
      </form>
      <p className="mt-6 text-sm text-[#a5abbd]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[#ff923e] font-medium hover:underline">Create an account</Link>
      </p>
    </>
  )
}

export default function Login() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your ASAP account.">
      <Suspense fallback={<div className="h-64 rounded-2xl bg-white/5 animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
