'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Eye, EyeOff, Loader2, ChevronRight, ChevronLeft, Smartphone, Download } from 'lucide-react'
import { signUp, insertAppUser, checkDriverEmailExists, insertDriver } from '@/lib/supabase_queries'

const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank', code: '023' },
  { name: 'Ecobank', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Bank', code: '090267' },
  { name: 'Moniepoint', code: '50515' },
  { name: 'OPay', code: '100004' },
  { name: 'PalmPay', code: '100033' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank', code: '032' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
]

type Step = 'account' | 'driver' | 'done'

export default function DriverSignup() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [account, setAccount] = useState({ username: '', email: '', password: '' })
  const [driver, setDriver] = useState({
    name: '',
    phone: '',
    license_number: '',
    vehicle_type: 'EV' as 'EV' | 'Bike',
    vehicle: '',
    bank_account_number: '',
    bank_code: '',
  })

  function updateAccount(field: keyof typeof account, value: string) {
    setAccount((prev) => ({ ...prev, [field]: value }))
  }
  function updateDriver(field: keyof typeof driver, value: string) {
    setDriver((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: existing } = await checkDriverEmailExists(account.email)
    if (existing) { setError('A driver account with this email already exists.'); setLoading(false); return }

    const { data: authData, error: authError } = await signUp(account.email, account.password)
    if (authError || !authData.user) { setError(authError?.message ?? 'Sign up failed.'); setLoading(false); return }

    await insertAppUser(authData.user.id, account.username)

    const { error: driverError } = await insertDriver({
      driver_id: authData.user.id,
      name: driver.name,
      email: account.email,
      phone: driver.phone,
      license_number: driver.license_number,
      vehicle_type: driver.vehicle_type,
      vehicle: driver.vehicle,
      account_number: driver.bank_account_number,
      bank_code: driver.bank_code,
    })

    if (driverError) { setError('Could not create driver profile: ' + driverError.message); setLoading(false); return }
    setStep('done')
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-[#a5abbd]/15 bg-[#152035] text-[#e0e5f9] placeholder:text-[#a5abbd]/50 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition'

  const steps = ['account', 'driver'] as const
  const stepLabels: Record<typeof steps[number], string> = { account: 'Account', driver: 'Driver Info' }

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

        {step !== 'done' && (
          <div className="flex items-center justify-center gap-3 mb-8">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step === s ? 'bg-linear-to-r from-[#ff923e] to-[#c46018] text-white'
                  : i === 0 && step === 'driver' ? 'bg-emerald-500 text-white'
                  : 'bg-[#1c2a42] text-[#a5abbd]'
                }`}>
                  {i === 0 && step === 'driver' ? '✓' : i + 1}
                </div>
                <span className={`text-sm font-medium ${step === s ? 'text-[#ff923e]' : 'text-[#a5abbd]'}`}>
                  {stepLabels[s]}
                </span>
                {i === 0 && <div className="w-8 h-px bg-[#a5abbd]/20" />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-[#1c2a42] rounded-3xl p-8 shadow-[0_12px_32px_rgba(8,14,28,0.5)]">
          {error && <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm mb-5">{error}</div>}

          {step === 'account' && (
            <div className="space-y-5">
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
              <button type="button"
                disabled={!account.username || !account.email || account.password.length < 8}
                onClick={() => { setError(''); setStep('driver') }}
                className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold hover:shadow-[0_12px_32px_rgba(255,146,62,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 'driver' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Full Name</label>
                  <input type="text" required value={driver.name} onChange={(e) => updateDriver('name', e.target.value)} placeholder="John Doe" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Phone</label>
                  <input type="tel" required value={driver.phone} onChange={(e) => updateDriver('phone', e.target.value)} placeholder="+234..." className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Vehicle Type</label>
                  <select required value={driver.vehicle_type} onChange={(e) => updateDriver('vehicle_type', e.target.value as 'EV' | 'Bike')} className={inputClass}>
                    <option value="EV">EV (Car)</option>
                    <option value="Bike">Bike</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">License Number</label>
                  <input type="text" required value={driver.license_number} onChange={(e) => updateDriver('license_number', e.target.value)} placeholder="ABC-123456" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Vehicle Plate</label>
                  <input type="text" required value={driver.vehicle} onChange={(e) => updateDriver('vehicle', e.target.value)} placeholder="LG-123-AA" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Bank Account Number</label>
                  <input type="text" required value={driver.bank_account_number} onChange={(e) => updateDriver('bank_account_number', e.target.value)} placeholder="0123456789" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Bank</label>
                  <select required value={driver.bank_code} onChange={(e) => updateDriver('bank_code', e.target.value)} className={inputClass}>
                    <option value="">Select your bank</option>
                    {NIGERIAN_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('account')}
                  className="flex-1 py-3 border border-[#a5abbd]/20 text-[#a5abbd] rounded-full font-semibold hover:bg-[#253350] hover:text-[#e0e5f9] transition flex items-center justify-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-2 py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold hover:shadow-[0_12px_32px_rgba(255,146,62,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : 'Complete Registration'}
                </button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#e0e5f9] mb-2">You're registered!</h2>
                <p className="text-[#a5abbd] text-sm">
                  Your driver account is ready. Download the ASAP Driver app to start accepting rides and deliveries.
                </p>
              </div>
              <div className="space-y-3">
                <a href="#" className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-black text-white rounded-2xl font-semibold hover:bg-[#111] transition">
                  <Download className="w-5 h-5" />
                  Download on the App Store
                </a>
                <a href="#" className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-[#0f1626] border border-[#a5abbd]/15 text-[#e0e5f9] rounded-2xl font-semibold hover:bg-[#1c2a42] transition">
                  <Download className="w-5 h-5" />
                  Get it on Google Play
                </a>
              </div>
              <p className="text-xs text-[#a5abbd]/60">
                Use the email and password you just created to sign in to the app.
              </p>
            </div>
          )}

          {step !== 'done' && (
            <p className="mt-6 text-center text-sm text-[#a5abbd]">
              Already have an account?{' '}
              <Link href="/login" className="text-[#ff923e] font-medium hover:underline">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
