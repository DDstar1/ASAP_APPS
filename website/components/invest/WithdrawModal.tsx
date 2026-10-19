'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, X, AlertCircle, Lock } from 'lucide-react'
import { requestWithdrawal, naira, PIN_LENGTH } from '@/lib/invest'
import PinInput from '@/components/invest/PinInput'

type Props = { balance: number; onClose: () => void; onDone: (amount: number) => void }

export default function WithdrawModal({ balance, onClose, onDone }: Props) {
  const [amount, setAmount] = useState((balance / 100).toFixed(2))
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const kobo = Math.round(Number(amount) * 100)
    if (!Number.isFinite(kobo) || kobo <= 0) { setError('Enter an amount to withdraw.'); return }
    if (kobo > balance) { setError(`You can withdraw up to ${naira(balance, 2)}.`); return }
    if (pin.length !== PIN_LENGTH) { setError(`Enter your ${PIN_LENGTH}-digit PIN.`); return }
    setBusy(true)
    setError('')
    try {
      const w = await requestWithdrawal(pin, kobo === balance ? undefined : kobo)
      onDone(w.amount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request the withdrawal. Try again.')
      setPin('')
      setBusy(false)
    }
  }

  const input = 'w-full px-4 py-3 rounded-xl border border-inv-line bg-inv-surface text-inv-text focus:outline-none focus:border-[#ff923e] focus:ring-2 focus:ring-[#ff923e]/25 transition'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby="withdraw-title"
        className="relative w-full max-w-md bg-inv-surface rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 id="withdraw-title" className="text-xl font-bold text-inv-text">Withdraw</h2>
            <p className="text-sm text-inv-muted mt-1">Available: {naira(balance, 2)}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
            className="p-2 -m-2 rounded-full text-inv-muted hover:text-inv-text hover:bg-inv-soft cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label htmlFor="withdraw-amount" className="block text-sm font-medium text-inv-text mb-1.5">Amount (₦)</label>
        <div className="relative mb-5">
          <input id="withdraw-amount" type="number" inputMode="decimal" min="0" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)} className={`${input} pr-16 tabular-nums`} />
          <button type="button" onClick={() => setAmount((balance / 100).toFixed(2))}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold text-inv-accent-text hover:bg-inv-soft cursor-pointer">
            Max
          </button>
        </div>

        <PinInput id="withdraw-pin" label="Withdrawal PIN" value={pin} onChange={setPin} />
        <Link href="/invest/settings" className="inline-block text-xs font-semibold text-inv-accent-text mt-2">Change your PIN</Link>

        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-600 mt-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </p>
        )}

        <button type="submit" disabled={busy}
          className="w-full mt-6 inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white font-semibold transition cursor-pointer disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Confirm withdrawal
        </button>
        <p className="text-xs text-inv-muted text-center mt-3">One withdrawal per month, paid to your bank account.</p>
      </form>
    </div>
  )
}
