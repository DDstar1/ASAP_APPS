'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import type { PostgrestError } from '@supabase/supabase-js'
import {
  Loader2, Store, MapPin, Landmark, Truck, Trash2, AlertCircle, CheckCircle, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { checkVendorNameExists, updateVendor, deleteStore, checkInServiceArea } from '@/lib/supabase_queries'
import BankSelect from '@/components/BankSelect'
import { useVendorStore } from '@/store/vendorStore'
import type { VendorRow } from '@/lib/supabase'

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false })

const OUTSIDE_COVERAGE = 'Sorry, outside our current coverage.'

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-v-muted/15 bg-v-raised text-v-text placeholder:text-v-muted/40 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition text-sm'
const saveClass =
  'py-2.5 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2'

type Section = 'details' | 'location' | 'bank' | 'logistics' | 'delete'
type Notice = { section: Section; kind: 'error' | 'success'; text: string }

// The database raises P0001 with a message written for the vendor (open
// orders, coverage); anything else gets a generic line
function errorText(error: PostgrestError, fallback: string) {
  if (error.code === 'P0001') return error.message
  if (error.code === '23505') return 'A store with this name already exists.'
  return fallback
}

// Postgres time comes back as HH:MM:SS; the time input wants HH:MM
const hhmm = (t: string) => t.slice(0, 5)

export default function SettingsPage() {
  const router = useRouter()
  const { vendor, vendors, setVendor, setVendors } = useVendorStore()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [saving, setSaving] = useState<Section | null>(null)

  const [details, setDetails] = useState({ name: '', phone: '', open_time: '', close_time: '' })
  const [location, setLocation] = useState<{ lat: number | null; lng: number | null; address: string }>({ lat: null, lng: null, address: '' })
  const [bank, setBank] = useState({ bank_account_number: '', bank_code: '' })

  // Reset the forms when the vendor switches store (during render, not in an effect)
  const [formFor, setFormFor] = useState<number | null>(null)
  if (vendor && formFor !== vendor.id) {
    setFormFor(vendor.id)
    setDetails({ name: vendor.name, phone: vendor.phone, open_time: hhmm(vendor.open_time), close_time: hhmm(vendor.close_time) })
    setLocation({ lat: vendor.lat, lng: vendor.lng, address: vendor.address })
    const acct = (vendor.acct_details ?? {}) as { bank_account_number?: string; bank_code?: string }
    setBank({ bank_account_number: acct.bank_account_number ?? '', bank_code: acct.bank_code ?? '' })
    setNotice(null)
  }

  if (!vendor) return null

  // Keep the sidebar and every page on the saved row
  function syncVendor(row: VendorRow) {
    setVendor(row)
    setVendors(vendors.map((v) => (v.id === row.id ? row : v)))
  }

  async function save(section: Section, payload: Parameters<typeof updateVendor>[1], success: string) {
    setSaving(section)
    setNotice(null)
    const { data, error } = await updateVendor(vendor!.id, payload)
    setSaving(null)
    if (error || !data) {
      setNotice({ section, kind: 'error', text: error ? errorText(error, 'Could not save. Try again.') : 'Could not save. Try again.' })
      return null
    }
    syncVendor(data as VendorRow)
    setNotice({ section, kind: 'success', text: success })
    return data as VendorRow
  }

  async function handleSaveDetails(e: React.SyntheticEvent) {
    e.preventDefault()
    const name = details.name.trim()
    // The name check would match this store's own name, so only ask on a real rename
    if (name.toLowerCase() !== vendor!.name.toLowerCase()) {
      const { data: taken } = await checkVendorNameExists(name)
      if (taken) { setNotice({ section: 'details', kind: 'error', text: 'A store with this name already exists.' }); return }
    }
    await save('details', { name, phone: details.phone.trim(), open_time: details.open_time, close_time: details.close_time }, 'Store details saved.')
  }

  async function handleSaveLocation() {
    if (location.lat === null || location.lng === null) return
    const wasOn = vendor!.allows_logistics
    const row = await save('location', { lat: location.lat, lng: location.lng, address: location.address.trim() }, 'Location saved.')
    // The database switches Logistics off when the store moves out of coverage
    if (row && wasOn && !row.allows_logistics) {
      setNotice({ section: 'location', kind: 'success', text: `Location saved. Logistics was turned off: ${OUTSIDE_COVERAGE.toLowerCase()}` })
    }
  }

  async function handleSaveBank(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!/^\d{10}$/.test(bank.bank_account_number)) {
      setNotice({ section: 'bank', kind: 'error', text: 'Account number must be 10 digits.' })
      return
    }
    await save('bank', { acct_details: bank }, 'Payout account saved.')
  }

  async function handleToggleLogistics() {
    const turnOn = !vendor!.allows_logistics
    if (turnOn) {
      // Ask first for a friendly message; the database enforces it anyway
      setSaving('logistics')
      setNotice(null)
      const { data: inside } = await checkInServiceArea(vendor!.lat, vendor!.lng)
      if (inside === false) {
        setSaving(null)
        setNotice({ section: 'logistics', kind: 'error', text: OUTSIDE_COVERAGE })
        return
      }
    }
    await save('logistics', { allows_logistics: turnOn }, turnOn ? 'Logistics turned on.' : 'Logistics turned off.')
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${vendor!.name}? Its bot is switched off and the store disappears from your dashboard. This can't be undone from here.`)) return
    setSaving('delete')
    setNotice(null)
    const { error } = await deleteStore(vendor!.id)
    setSaving(null)
    if (error) {
      setNotice({ section: 'delete', kind: 'error', text: errorText(error, 'Could not delete the store. Try again.') })
      return
    }
    const remaining = vendors.filter((v) => v.id !== vendor!.id)
    if (remaining.length === 0) {
      setVendors([])
      setVendor(null)
      router.replace('/home')
      return
    }
    setVendors(remaining)
    setVendor(remaining[0])
    router.push('/vendor/dashboard')
  }

  const noticeFor = (section: Section) =>
    notice?.section === section && (
      <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm ${notice.kind === 'error' ? 'bg-red-500/10 text-v-down' : 'bg-emerald-500/10 text-v-up'}`}>
        {notice.kind === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
        {notice.text}
      </div>
    )

  const locationChanged = location.lat !== vendor.lat || location.lng !== vendor.lng || location.address.trim() !== vendor.address

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-v-text tracking-tight">Settings</h1>
        <p className="text-v-muted mt-1">Settings for {vendor.name}</p>
      </div>

      {/* Store details */}
      <form onSubmit={handleSaveDetails} className="bg-v-card rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-v-text flex items-center gap-2">
          <Store className="w-5 h-5 text-v-accent" />
          Store details
        </h2>
        {noticeFor('details')}
        <div>
          <label htmlFor="store-name" className="block text-sm font-medium text-v-text mb-1.5">Store name</label>
          <input id="store-name" type="text" required value={details.name} onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label htmlFor="store-phone" className="block text-sm font-medium text-v-text mb-1.5">Phone</label>
          <input id="store-phone" type="tel" required autoComplete="tel" value={details.phone} onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))} placeholder="+234..." className={inputClass} />
          <p className="text-xs text-v-muted/60 mt-1.5">Riders and customers call this number about orders</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="open-time" className="block text-sm font-medium text-v-text mb-1.5">Opens at</label>
            <input id="open-time" type="time" required value={details.open_time} onChange={(e) => setDetails((d) => ({ ...d, open_time: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="close-time" className="block text-sm font-medium text-v-text mb-1.5">Closes at</label>
            <input id="close-time" type="time" required value={details.close_time} onChange={(e) => setDetails((d) => ({ ...d, close_time: e.target.value }))} className={inputClass} />
          </div>
          <p className="col-span-2 text-xs text-v-muted/60 -mt-2">
            Nigerian time. If ASAP Logistics is on, your bot stays online outside these hours but doesn&apos;t take new delivery orders.
          </p>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving === 'details'} className={saveClass}>
            {saving === 'details' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save details'}
          </button>
        </div>
      </form>

      {/* Location */}
      <div className="bg-v-card rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-v-text flex items-center gap-2">
            <MapPin className="w-5 h-5 text-v-accent" />
            Store location
          </h2>
          <p className="text-xs text-v-muted/60 mt-1">
            Riders collect orders here and ASAP checks delivery range from it. It can&apos;t be changed while orders are open.
          </p>
        </div>
        {noticeFor('location')}
        <LocationPicker
          lat={location.lat}
          lng={location.lng}
          onChange={(lat, lng) => setLocation((l) => ({ ...l, lat, lng }))}
          onAddress={(address) => setLocation((l) => ({ ...l, address }))}
        />
        <div>
          <label htmlFor="store-address" className="block text-sm font-medium text-v-text mb-1.5">Address</label>
          <input id="store-address" type="text" required value={location.address} onChange={(e) => setLocation((l) => ({ ...l, address: e.target.value }))} className={inputClass} />
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={handleSaveLocation} disabled={saving === 'location' || !locationChanged || !location.address.trim()} className={saveClass}>
            {saving === 'location' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save location'}
          </button>
        </div>
      </div>

      {/* Logistics */}
      <div className="bg-v-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-v-text flex items-center gap-2">
              <Truck className="w-5 h-5 text-v-accent" />
              Logistics
            </h2>
            <p className="text-xs text-v-muted/60 mt-1">ASAP riders deliver this store&apos;s orders. Only available inside our coverage area.</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${vendor.allows_logistics ? 'bg-emerald-500/10 text-v-up' : 'bg-v-muted/10 text-v-muted'}`}>
            {vendor.allows_logistics ? 'On' : 'Off'}
          </span>
        </div>
        {noticeFor('logistics')}
        <button
          type="button"
          onClick={handleToggleLogistics}
          disabled={saving === 'logistics'}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition w-full justify-center ${
            vendor.allows_logistics
              ? 'border border-v-muted/20 text-v-muted hover:bg-v-raised hover:text-v-text'
              : 'bg-emerald-500/15 text-v-up hover:bg-emerald-500/25'
          } disabled:opacity-60`}
        >
          {saving === 'logistics'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : vendor.allows_logistics ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
          {vendor.allows_logistics ? 'Turn logistics off' : 'Turn logistics on'}
        </button>
      </div>

      {/* Payout account */}
      <form onSubmit={handleSaveBank} className="bg-v-card rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-v-text flex items-center gap-2">
            <Landmark className="w-5 h-5 text-v-accent" />
            Payout account
          </h2>
          <p className="text-xs text-v-muted/60 mt-1">Where this store&apos;s earnings are paid</p>
        </div>
        {noticeFor('bank')}
        <div>
          <label htmlFor="bank-code" className="block text-sm font-medium text-v-text mb-1.5">Bank</label>
          <BankSelect id="bank-code" value={bank.bank_code} onChange={(code) => setBank((b) => ({ ...b, bank_code: code }))} className={inputClass} />
        </div>
        <div>
          <label htmlFor="account-number" className="block text-sm font-medium text-v-text mb-1.5">Account number</label>
          <input id="account-number" type="text" inputMode="numeric" required maxLength={10} value={bank.bank_account_number} onChange={(e) => setBank((b) => ({ ...b, bank_account_number: e.target.value.replace(/\D/g, '') }))} placeholder="0123456789" className={inputClass} />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving === 'bank' || !bank.bank_code} className={saveClass}>
            {saving === 'bank' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save account'}
          </button>
        </div>
      </form>

      {/* Delete store */}
      <div className="bg-v-card rounded-2xl p-6 space-y-4 border border-red-500/20">
        <div>
          <h2 className="text-base font-semibold text-v-down flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Delete store
          </h2>
          <p className="text-xs text-v-muted/60 mt-1">
            Removes {vendor.name} from your dashboard and switches its bot off. Your other stores and your login are not affected.
            Not possible while orders are open or refunds are pending.
          </p>
        </div>
        {noticeFor('delete')}
        <button
          type="button"
          onClick={handleDelete}
          disabled={saving === 'delete'}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition w-full justify-center bg-red-500/10 text-v-down hover:bg-red-500/20 disabled:opacity-60"
        >
          {saving === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete this store
        </button>
      </div>
    </div>
  )
}
