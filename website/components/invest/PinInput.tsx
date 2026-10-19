'use client'

import { PIN_LENGTH } from '@/lib/invest'

type Props = { id: string; label: string; value: string; onChange: (pin: string) => void; autoFocus?: boolean; hint?: string }

export default function PinInput({ id, label, value, onChange, autoFocus, hint }: Props) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-inv-text mb-1.5">{label}</label>
      <input id={id} type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]*" maxLength={PIN_LENGTH}
        autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
        className="w-full px-4 py-3 rounded-xl border border-inv-line bg-inv-surface text-inv-text text-center text-2xl tracking-[0.75em] font-semibold focus:outline-none focus:border-[#ff923e] focus:ring-2 focus:ring-[#ff923e]/25 transition" />
      {hint && <p className="text-xs text-inv-muted mt-1.5">{hint}</p>}
    </div>
  )
}
