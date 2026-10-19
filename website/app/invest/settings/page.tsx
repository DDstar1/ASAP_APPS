'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, CheckCircle, User, ShieldCheck, Landmark } from 'lucide-react'
import { updateUsername } from '@/lib/supabase_queries'
import { getBanks } from '@/lib/banks'
import {
  getBankDetails, createPin, changePin, saveBankDetails, RustError, PIN_LENGTH, type BankDetails,
} from '@/lib/invest'
import { useInvest } from '@/components/invest/InvestContext'
import BankSelect from '@/components/BankSelect'
import PinInput from '@/components/invest/PinInput'

type Note = { ok: boolean; text: string } | null

const input = 'w-full px-4 py-3 rounded-xl border border-inv-line bg-inv-surface text-inv-text placeholder:text-inv-muted/60 focus:outline-none focus:border-[#ff923e] focus:ring-2 focus:ring-[#ff923e]/25 transition'
const button = 'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

export default function SettingsPage() {
  const { userId } = useInvest()
  const [bank, setBank] = useState<BankDetails | null | undefined>(undefined)
  const [pinMode, setPinMode] = useState<'create' | 'change'>('create')

  useEffect(() => {
    let cancelled = false
    getBankDetails(userId).then(({ data }) => {
      if (cancelled) return
      setBank(data)
      if (data) setPinMode('change')
    })
    return () => { cancelled = true }
  }, [userId])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-inv-text">Settings</h1>
      <UsernameSection />
      {bank === undefined ? (
        <div className="h-72 rounded-3xl bg-inv-surface border border-inv-line animate-pulse" />
      ) : (
        <>
          <PinSection mode={pinMode} onCreated={() => setPinMode('change')} />
          <BankSection bank={bank} pinReady={pinMode === 'change'} onSaved={setBank} />
        </>
      )}
    </div>
  )
}

function UsernameSection() {
  const { userId, username, setUsername } = useInvest()
  const [name, setName] = useState(username)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note>(null)

  async function save(e: React.SyntheticEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2 || trimmed.length > 30) { setNote({ ok: false, text: 'Use 2 to 30 characters.' }); return }
    setBusy(true)
    setNote(null)
    const { error } = await updateUsername(userId, trimmed)
    setBusy(false)
    if (error) { setNote({ ok: false, text: 'Could not save your username. Try again.' }); return }
    setUsername(trimmed)
    setName(trimmed)
    setNote({ ok: true, text: 'Username saved. It shows in the ASAP app too.' })
  }

  return (
    <Section icon={User} title="Username" description="Your name across ASAP, including the app.">
      <form onSubmit={save} className="space-y-4">
        <input aria-label="Username" value={name} onChange={(e) => setName(e.target.value)} maxLength={30}
          autoComplete="username" className={input} />
        <NoteLine note={note} />
        <button type="submit" disabled={busy || name.trim() === username} className={button}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save
        </button>
      </form>
    </Section>
  )
}

function PinSection({ mode, onCreated }: { mode: 'create' | 'change'; onCreated: () => void }) {
  const [current, setCurrent] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note>(null)

  async function save(e: React.SyntheticEvent) {
    e.preventDefault()
    if (mode === 'change' && current.length !== PIN_LENGTH) { setNote({ ok: false, text: 'Enter your current PIN.' }); return }
    if (pin.length !== PIN_LENGTH) { setNote({ ok: false, text: `Your new PIN must be ${PIN_LENGTH} digits.` }); return }
    if (pin !== confirm) { setNote({ ok: false, text: 'The new PINs do not match.' }); return }
    setBusy(true)
    setNote(null)
    try {
      if (mode === 'create') {
        await createPin(pin)
        onCreated()
        setNote({ ok: true, text: 'PIN created.' })
      } else {
        await changePin(current, pin)
        setNote({ ok: true, text: 'PIN changed.' })
      }
      setCurrent(''); setPin(''); setConfirm('')
    } catch (err) {
      if (mode === 'create' && err instanceof RustError && err.status === 409) {
        onCreated()
        setNote({ ok: false, text: 'You already have a PIN. Enter it below to change it.' })
      } else {
        setNote({ ok: false, text: err instanceof Error ? err.message : 'Could not save your PIN. Try again.' })
        setCurrent('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section icon={ShieldCheck} title="Withdrawal PIN"
      description={mode === 'create'
        ? 'Needed to withdraw earnings or change your bank account.'
        : 'After 5 wrong tries your PIN locks for 30 minutes. If that wasn’t you, change it here.'}>
      <form onSubmit={save} className="space-y-4">
        {mode === 'change' && <PinInput id="pin-current" label="Current PIN" value={current} onChange={setCurrent} />}
        <div className="grid sm:grid-cols-2 gap-4">
          <PinInput id="pin-new" label="New PIN" value={pin} onChange={setPin} />
          <PinInput id="pin-confirm" label="Confirm new PIN" value={confirm} onChange={setConfirm} />
        </div>
        <NoteLine note={note} />
        <button type="submit" disabled={busy} className={button}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {mode === 'create' ? 'Create PIN' : 'Change PIN'}
        </button>
      </form>
    </Section>
  )
}

function BankSection({ bank, pinReady, onSaved }: { bank: BankDetails | null; pinReady: boolean; onSaved: (b: BankDetails) => void }) {
  const [bankName, setBankName] = useState<string | null>(null)
  const [bankCode, setBankCode] = useState('')
  const [account, setAccount] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note>(null)

  useEffect(() => {
    if (!bank) return
    let cancelled = false
    getBanks().then((banks) => {
      if (!cancelled) setBankName(banks.find((b) => b.code === bank.bank_code)?.name ?? null)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [bank])

  async function save(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!bankCode) { setNote({ ok: false, text: 'Choose your bank.' }); return }
    if (!/^\d{10}$/.test(account)) { setNote({ ok: false, text: 'Enter your 10-digit account number.' }); return }
    if (pin.length !== PIN_LENGTH) { setNote({ ok: false, text: `Enter your ${PIN_LENGTH}-digit PIN.` }); return }
    setBusy(true)
    setNote(null)
    try {
      onSaved(await saveBankDetails(account, bankCode, pin))
      setBankCode(''); setAccount(''); setPin('')
      setNote({ ok: true, text: 'Bank details saved.' })
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : 'Could not save your bank details. Try again.' })
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section icon={Landmark} title="Bank details" description="Where your withdrawals are paid.">
      {bank && (
        <div className="rounded-2xl bg-inv-soft px-4 py-3 mb-5">
          <p className="text-xs text-inv-muted">Current account</p>
          <p className="font-semibold text-inv-text mt-0.5">
            {bankName ?? `Bank ${bank.bank_code}`} · <span className="tabular-nums">•••• {bank.bank_account_number.slice(-4)}</span>
          </p>
        </div>
      )}
      {!pinReady ? (
        <p className="text-sm text-inv-muted">Create your withdrawal PIN first.</p>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="bank-code" className="block text-sm font-medium text-inv-text mb-1.5">Bank</label>
            <BankSelect id="bank-code" value={bankCode} onChange={setBankCode} className={input} />
          </div>
          <div>
            <label htmlFor="bank-account" className="block text-sm font-medium text-inv-text mb-1.5">Account number</label>
            <input id="bank-account" inputMode="numeric" maxLength={10} value={account}
              onChange={(e) => setAccount(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className={`${input} tabular-nums tracking-wider`} />
          </div>
          <PinInput id="bank-pin" label="Withdrawal PIN" value={pin} onChange={setPin} />
          <NoteLine note={note} />
          <button type="submit" disabled={busy} className={button}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} {bank ? 'Update bank details' : 'Save bank details'}
          </button>
        </form>
      )}
    </Section>
  )
}

function NoteLine({ note }: { note: Note }) {
  if (!note) return null
  const Icon = note.ok ? CheckCircle : AlertCircle
  return (
    <p role={note.ok ? 'status' : 'alert'} className={`flex items-start gap-2 text-sm ${note.ok ? 'text-emerald-600' : 'text-red-600'}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" /> {note.text}
    </p>
  )
}

function Section({ icon: Icon, title, description, children }: {
  icon: typeof User; title: string; description: string; children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl bg-inv-surface border border-inv-line p-6 sm:p-8">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-10 h-10 rounded-xl bg-[#ff923e]/12 text-inv-accent-text flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-inv-text">{title}</h2>
          <p className="text-sm text-inv-muted mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}
