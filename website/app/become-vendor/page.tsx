'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Loader2, ChevronRight } from 'lucide-react'
import { getSession, checkVendorNameExists, insertVendor } from '@/lib/supabase_queries'

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false })

export default function BecomeVendor() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    open_time: '08:00',
    close_time: '20:00',
    acct_type: 'vendor' as 'vendor' | 'Handy-man' | 'service-provider',
  })

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) { router.replace('/login?next=/become-vendor'); return }
      setUserEmail(user.email ?? '')
      setChecking(false)
    })
  }, [router])

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (lat === null || lng === null) { setError('Please pick your store location on the map.'); return }
    setLoading(true)
    setError('')

    const { data: existing } = await checkVendorNameExists(form.name)
    if (existing) { setError('A vendor with this name already exists.'); setLoading(false); return }

    const { error: vendorError } = await insertVendor({
      name: form.name,
      email: userEmail,
      phone: form.phone,
      address: form.address,
      open_time: form.open_time,
      close_time: form.close_time,
      lat,
      lng,
      acct_type: form.acct_type,
    })

    if (vendorError) { setError('Could not create vendor profile: ' + vendorError.message); setLoading(false); return }
    router.push('/vendor/dashboard')
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-[#a5abbd]/15 bg-[#152035] text-[#e0e5f9] placeholder:text-[#a5abbd]/50 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition'

  if (checking) {
    return (
      <div className="min-h-screen bg-[#080e1c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff923e]" />
      </div>
    )
  }

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
          <h1 className="text-3xl font-bold text-[#e0e5f9]">Add a Store</h1>
          <p className="text-[#a5abbd] mt-2">Set up another store on ASAP</p>
        </div>

        <div className="bg-[#1c2a42] rounded-3xl p-8 shadow-[0_12px_32px_rgba(8,14,28,0.5)]">
          {error && <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Store Name</label>
                <input type="text" required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="My Awesome Store" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Phone</label>
                <input type="tel" required value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+234..." className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Account Type</label>
                <select value={form.acct_type} onChange={(e) => update('acct_type', e.target.value as typeof form.acct_type)} className={inputClass}>
                  <option value="vendor">Vendor</option>
                  <option value="Handy-man">Handy-man</option>
                  <option value="service-provider">Service Provider</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Address</label>
                <input type="text" required value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="123 Main Street, City" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Opens at</label>
                <input type="time" required value={form.open_time} onChange={(e) => update('open_time', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Closes at</label>
                <input type="time" required value={form.close_time} onChange={(e) => update('close_time', e.target.value)} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e0e5f9] mb-1.5">Store Location</label>
              <p className="text-xs text-[#a5abbd]/70 mb-2">Click on the map or drag the pin to set your store&apos;s location</p>
              <LocationPicker lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng) }} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold hover:shadow-[0_12px_32px_rgba(255,146,62,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><ChevronRight className="w-4 h-4" /> Create Vendor Account</>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#a5abbd]">
            Changed your mind?{' '}
            <Link href="/home" className="text-[#ff923e] font-medium hover:underline">Go back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
