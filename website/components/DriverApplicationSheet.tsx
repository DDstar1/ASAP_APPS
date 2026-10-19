'use client'

import { useState } from 'react'
import { X, Loader2, AlertCircle, CheckCircle, Bike, Zap } from 'lucide-react'
import { submitApplication, toE164, type DriverApplication } from '@/lib/driverApplications'

type Props = { defaultName?: string; onClose: () => void; onSubmitted: (application: DriverApplication) => void }

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-[#a5abbd]/15 bg-[#0d1525] text-[#e0e5f9] placeholder:text-[#a5abbd]/40 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition text-sm'
const labelClass = 'block text-sm font-medium text-[#e0e5f9] mb-1.5'

export default function DriverApplicationSheet({ defaultName = '', onClose, onSubmitted }: Props) {
  const [assetType, setAssetType] = useState<'ev' | 'bicycle'>('ev')
  const [form, setForm] = useState({
    full_name: defaultName, phone: '', area: '', nin: '', license_number: '', experience: '', guarantor_name: '', guarantor_phone: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const phone = toE164(form.phone)
    const guarantorPhone = form.guarantor_phone.trim() ? toE164(form.guarantor_phone) : null
    const licence = form.license_number.replace(/[\s-]/g, '').toUpperCase()
    if (form.full_name.trim().length < 2) { setError('Enter your full name.'); return }
    if (!phone) { setError('Enter a valid Nigerian phone number, e.g. 0803 123 4567.'); return }
    if (!/^\d{11}$/.test(form.nin)) { setError('Your NIN is 11 digits.'); return }
    if (!form.area.trim()) { setError('Tell us where you live or want to ride.'); return }
    if (assetType === 'ev' && !/^[A-Z0-9]{12}$/.test(licence)) { setError('Enter your 12-character driver’s licence number.'); return }
    if (form.guarantor_phone.trim() && !guarantorPhone) { setError('Enter a valid phone number for your guarantor.'); return }
    setBusy(true)
    setError('')
    try {
      const application = await submitApplication({
        asset_type: assetType,
        full_name: form.full_name.trim(),
        phone,
        area: form.area.trim(),
        nin: form.nin,
        license_number: assetType === 'ev' ? licence : null,
        experience: form.experience.trim() || null,
        guarantor_name: form.guarantor_name.trim() || null,
        guarantor_phone: guarantorPhone,
      })
      setDone(true)
      onSubmitted(application)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your application. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="apply-title"
        className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-[#1c2a42] rounded-t-3xl sm:rounded-3xl shadow-[0_-12px_40px_rgba(8,14,28,0.6)]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 pt-5 pb-4 bg-[#1c2a42] border-b border-[#a5abbd]/10">
          <h2 id="apply-title" className="text-lg font-bold text-[#e0e5f9]">{done ? 'Application sent' : 'Ride an ASAP vehicle'}</h2>
          <button onClick={onClose} disabled={busy} aria-label="Close"
            className="p-2 -m-2 rounded-full text-[#a5abbd] hover:text-[#e0e5f9] hover:bg-[#253350] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-[#e0e5f9] font-semibold">We&apos;ve got your application.</p>
            <p className="text-sm text-[#a5abbd] mt-2 max-w-sm mx-auto">
              The ASAP team will call or email you to book an in-person visit. Bring your NIN slip
              {assetType === 'ev' ? ' and driver’s licence' : ''} when you come.
            </p>
            <button onClick={onClose} className="mt-6 px-6 py-3 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white font-semibold cursor-pointer">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            <p className="text-sm text-[#a5abbd]">
              Don&apos;t have a bike? Apply to ride one of ASAP&apos;s. We&apos;ll contact you to finish in person.
            </p>

            <fieldset>
              <legend className={labelClass}>Vehicle</legend>
              <div className="grid grid-cols-2 gap-3">
                {([['ev', 'Electric bike', Zap], ['bicycle', 'Bicycle', Bike]] as const).map(([value, label, Icon]) => (
                  <button key={value} type="button" onClick={() => setAssetType(value)} aria-pressed={assetType === value}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                      assetType === value
                        ? 'border-[#ff923e] bg-[#ff923e]/10 text-[#ff923e]'
                        : 'border-[#a5abbd]/15 text-[#a5abbd] hover:text-[#e0e5f9]'}`}>
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="apply-name" className={labelClass}>Full name</label>
              <input id="apply-name" autoComplete="name" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className={inputClass} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="apply-phone" className={labelClass}>Phone</label>
                <input id="apply-phone" type="tel" autoComplete="tel" placeholder="0803 123 4567" value={form.phone}
                  onChange={(e) => update('phone', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="apply-nin" className={labelClass}>NIN</label>
                <input id="apply-nin" inputMode="numeric" maxLength={11} placeholder="11 digits" value={form.nin}
                  onChange={(e) => update('nin', e.target.value.replace(/\D/g, '').slice(0, 11))} className={`${inputClass} tabular-nums`} />
              </div>
            </div>
            <div>
              <label htmlFor="apply-area" className={labelClass}>Area</label>
              <input id="apply-area" placeholder="Where you live or want to ride" value={form.area}
                onChange={(e) => update('area', e.target.value)} className={inputClass} />
            </div>
            {assetType === 'ev' && (
              <div>
                <label htmlFor="apply-licence" className={labelClass}>Driver&apos;s licence number</label>
                <input id="apply-licence" maxLength={14} placeholder="12 characters" value={form.license_number}
                  onChange={(e) => update('license_number', e.target.value.toUpperCase())} className={`${inputClass} tracking-wider`} />
              </div>
            )}
            <div>
              <label htmlFor="apply-experience" className={labelClass}>Riding experience <span className="text-[#a5abbd] font-normal">(optional)</span></label>
              <textarea id="apply-experience" rows={2} placeholder="e.g. 2 years doing deliveries on a bike" value={form.experience}
                onChange={(e) => update('experience', e.target.value)} className={`${inputClass} resize-none`} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="apply-guarantor" className={labelClass}>Guarantor <span className="text-[#a5abbd] font-normal">(optional)</span></label>
                <input id="apply-guarantor" placeholder="Full name" value={form.guarantor_name}
                  onChange={(e) => update('guarantor_name', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="apply-guarantor-phone" className={labelClass}>Guarantor&apos;s phone</label>
                <input id="apply-guarantor-phone" type="tel" placeholder="0803 123 4567" value={form.guarantor_phone}
                  onChange={(e) => update('guarantor_phone', e.target.value)} className={inputClass} />
              </div>
            </div>

            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </p>
            )}

            <button type="submit" disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white font-semibold transition cursor-pointer disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send application
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
