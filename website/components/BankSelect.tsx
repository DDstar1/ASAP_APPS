'use client'

import { useEffect, useState } from 'react'
import { getBanks, type Bank } from '@/lib/banks'

interface Props {
  id?: string
  value: string
  onChange: (code: string) => void
  className: string
}

// Payout bank picker over Rust's bank list
export default function BankSelect({ id, value, onChange, className }: Props) {
  const [banks, setBanks] = useState<Bank[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getBanks().then(setBanks).catch(() => setFailed(true))
  }, [])

  return (
    <>
      <select id={id} required value={value} onChange={(e) => onChange(e.target.value)} disabled={banks.length === 0} className={className}>
        <option value="">{failed ? 'Could not load banks' : banks.length === 0 ? 'Loading banks...' : 'Select your bank'}</option>
        {banks.map((b) => (
          <option key={b.code} value={b.code}>{b.name}</option>
        ))}
      </select>
      {failed && <p className="text-xs text-red-400 mt-1.5">Could not load the bank list. Refresh the page to try again.</p>}
    </>
  )
}
