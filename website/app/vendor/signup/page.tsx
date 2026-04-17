'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Eye, EyeOff, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Step = 'account' | 'store'

export default function VendorSignup() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    address: '',
    open_time: '08:00',
    close_time: '20:00',
    lat: '',
    lng: '',
    acct_type: 'vendor' as 'vendor' | 'Handy-man' | 'service-provider',
  })

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Check name uniqueness
    const { data: existing } = await supabase
      .from('telegram_vendor')
      .select('id')
      .eq('name', form.name)
      .single()

    if (existing) {
      setError('A vendor with this name already exists.')
      setLoading(false)
      return
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Create vendor record
    const { error: vendorError } = await supabase.from('telegram_vendor').insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      open_time: form.open_time,
      close_time: form.close_time,
      lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0,
      acct_type: form.acct_type,
    })

    if (vendorError) {
      // Roll back auth if vendor insert fails
      if (authData.user) await supabase.auth.admin?.deleteUser?.(authData.user.id)
      setError('Could not create vendor profile: ' + vendorError.message)
      setLoading(false)
      return
    }

    router.push('/vendor/dashboard')
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-purple-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ASAP.
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Vendor Account</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Set up your store on ASAP</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {(['account', 'store'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step === s
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : i === 0 && step === 'store'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {i === 0 && step === 'store' ? '✓' : i + 1}
              </div>
              <span className={`text-sm font-medium ${step === s ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                {s === 'account' ? 'Account' : 'Store Info'}
              </span>
              {i === 0 && <div className="w-8 h-px bg-gray-300 dark:bg-gray-600" />}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800/50 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-5">
              {error}
            </div>
          )}

          {step === 'account' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
                <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="Min. 8 characters"
                    minLength={8}
                    className={`${inputClass} pr-12`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                type="button"
                disabled={!form.email || form.password.length < 8}
                onClick={() => setStep('store')}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 'store' && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Store Name</label>
                  <input type="text" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="My Awesome Store" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
                  <input type="tel" required value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+234..." className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Account Type</label>
                  <select value={form.acct_type} onChange={(e) => update('acct_type', e.target.value as typeof form.acct_type)} className={inputClass}>
                    <option value="vendor">Vendor</option>
                    <option value="Handy-man">Handy-man</option>
                    <option value="service-provider">Service Provider</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
                  <input type="text" required value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="123 Main Street, City" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Opens at</label>
                  <input type="time" required value={form.open_time} onChange={(e) => update('open_time', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Closes at</label>
                  <input type="time" required value={form.close_time} onChange={(e) => update('close_time', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Latitude</label>
                  <input type="number" step="any" value={form.lat} onChange={(e) => update('lat', e.target.value)} placeholder="e.g. 6.5244" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Longitude</label>
                  <input type="number" step="any" value={form.lng} onChange={(e) => update('lng', e.target.value)} placeholder="e.g. 3.3792" className={inputClass} />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('account')} className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/vendor/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
