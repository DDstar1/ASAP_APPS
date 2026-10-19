'use client'

import { useState } from 'react'
import { Loader2, X, AlertCircle, ShieldCheck, Landmark } from 'lucide-react'
import { createPin, saveBankDetails, RustError, PIN_LENGTH, type BankDetails } from '@/lib/invest'
import BankSelect from '@/components/BankSelect'
import PinInput from '@/components/invest/PinInput'

type Props = { onClose: () => void; onDone: (details: BankDetails) => void }

// First checkout: PIN, then the payout bank (Rust needs the PIN to save it)
export default function SecuritySetupModal({ onClose, onDone }: Props) {
  const [step, setStep] = useState<'pin' | 'bank'>('pin')
  const [hasPin, setHasPin] = useState(false)
  const [pin, setPinValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [account, setAccount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submitPin(e: React.SyntheticEvent) {
    e.preventDefault()
    if (pin.length !== PIN_LENGTH) { setError(`Your PIN must be ${PIN_LENGTH} digits.`); return }
    if (hasPin) { setError(''); setStep('bank'); return }
    if (pin !== confirm) { setError('The PINs do not match.'); return }
    setBusy(true)
    setError('')
    try {
      await createPin(pin)
      setStep('bank')
    } catch (err) {
      if (err instanceof RustError && err.status === 409) {
        setHasPin(true)
        setPinValue('')
        setConfirm('')
        setError('You already have a PIN. Enter it to continue.')
      } else {
        setError(err instanceof Error ? err.message : 'Could not set your PIN. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function submitBank(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!bankCode) { setError('Choose your bank.'); return }
    if (!/^\d{10}$/.test(account)) { setError('Enter your 10-digit account number.'); return }
    setBusy(true)
    setError('')
    try {
      onDone(await saveBankDetails(account, bankCode, pin))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your bank details. Try again.')
      if (err instanceof RustError && err.status === 403 && hasPin) { setStep('pin'); setPinValue('') }
      setBusy(false)
    }
  }

  const input = 'w-full px-4 py-3 rounded-xl border border-inv-line bg-inv-surface text-inv-text placeholder:text-inv-muted/60 focus:outline-none focus:border-[#ff923e] focus:ring-2 focus:ring-[#ff923e]/25 transition'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <form onSubmit={step === 'pin' ? submitPin : submitBank} role="dialog" aria-modal="true" aria-labelledby="setup-title"
        className="relative w-full max-w-md bg-inv-surface rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-[#ff923e]/12 text-inv-accent-text flex items-center justify-center">
            {step === 'pin' ? <ShieldCheck className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
            className="p-2 -m-2 rounded-full text-inv-muted hover:text-inv-text hover:bg-inv-soft cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs font-semibold text-inv-muted mt-3">Step {step === 'pin' ? 1 : 2} of 2</p>
        <h2 id="setup-title" className="text-xl font-bold text-inv-text mt-0.5">
          {step === 'pin' ? (hasPin ? 'Enter your PIN' : 'Create a withdrawal PIN') : 'Where should we pay you?'}
        </h2>
        <p className="text-sm text-inv-muted mt-1 mb-6">
          {step === 'pin'
            ? 'You’ll need this PIN to withdraw your earnings or change your bank account.'
            : 'Your earnings are paid to this account. Changing it later needs your PIN.'}
        </p>

        {step === 'pin' ? (
          <div className="space-y-4">
            <PinInput id="setup-pin" label={hasPin ? 'PIN' : `New ${PIN_LENGTH}-digit PIN`} value={pin} onChange={setPinValue} autoFocus />
            {!hasPin && <PinInput id="setup-pin-confirm" label="Confirm PIN" value={confirm} onChange={setConfirm} />}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="setup-bank" className="block text-sm font-medium text-inv-text mb-1.5">Bank</label>
              <BankSelect id="setup-bank" value={bankCode} onChange={setBankCode} className={input} />
            </div>
            <div>
              <label htmlFor="setup-account" className="block text-sm font-medium text-inv-text mb-1.5">Account number</label>
              <input id="setup-account" inputMode="numeric" maxLength={10} value={account}
                onChange={(e) => setAccount(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={`${input} tabular-nums tracking-wider`} />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-600 mt-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </p>
        )}

        <button type="submit" disabled={busy}
          className="w-full mt-6 inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white font-semibold transition cursor-pointer disabled:opacity-50">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {step === 'pin' ? 'Continue' : 'Save and continue to payment'}
        </button>
      </form>
    </div>
  )
}
