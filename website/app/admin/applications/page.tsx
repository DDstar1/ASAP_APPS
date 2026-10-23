'use client'

import { useEffect, useState } from 'react'
import { Loader2, Phone, Mail, MapPin, IdCard, UserCheck } from 'lucide-react'
import { shortDate } from '@/lib/invest'
import {
  getApplications, getAssets, contactApplication, rejectApplication, approveApplication, label,
  type Application, type ApplicationStatus, type AssetRow,
} from '@/lib/admin'
import { ErrorNote, Loading, PageTitle, Pills } from '@/components/admin/ui'

type StatusFilter = 'open' | ApplicationStatus
type TypeFilter = 'all' | 'ev' | 'bicycle'
type Action = { id: number; kind: 'contact' | 'approve' | 'reject' }

const STATUS_TONE: Record<ApplicationStatus, string> = {
  submitted: 'bg-amber-500/15 text-amber-700',
  contacted: 'bg-sky-500/15 text-sky-700',
  approved: 'bg-emerald-500/15 text-emerald-700',
  rejected: 'bg-red-500/15 text-red-600',
}

export default function ApplicationsPage() {
  const [status, setStatus] = useState<StatusFilter>('open')
  const [type, setType] = useState<TypeFilter>('all')
  const [reloads, setReloads] = useState(0)
  // Kept with the filters it was loaded for, so a change of filter shows loading until it answers
  const [result, setResult] = useState<{ key: string; items: Application[]; error: string } | null>(null)
  // Assets a driver can be put on: acquiring or active, with no driver yet
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [action, setAction] = useState<Action | null>(null)
  const key = `${status}|${type}|${reloads}`
  const items = result?.key === key ? result.items : null
  const error = result?.key === key ? result.error : ''

  useEffect(() => {
    let cancelled = false
    getApplications(status === 'open' ? null : status, type === 'all' ? null : type)
      .then(({ applications }) => { if (!cancelled) setResult({ key, items: applications, error: '' }) })
      .catch((e) => {
        if (!cancelled) setResult({ key, items: [], error: e instanceof Error ? e.message : 'Could not load applications.' })
      })
    return () => { cancelled = true }
  }, [key, status, type])

  const load = () => setReloads((n) => n + 1)

  useEffect(() => {
    getAssets({ preset: 'today' })
      .then((r) => setAssets(r.data.assets.filter((a) => ['acquiring', 'active'].includes(a.status) && !a.current_driver)))
      .catch(() => setAssets([]))
  }, [])

  return (
    <div>
      <PageTitle title="Driver applications" />

      <div className="flex flex-wrap gap-2 mb-6">
        <Pills label="Status" value={status} onChange={setStatus} options={[
          { value: 'open', label: 'Open' },
          { value: 'submitted', label: 'New' },
          { value: 'contacted', label: 'Contacted' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ]} />
        <Pills label="Vehicle" value={type} onChange={setType} options={[
          { value: 'all', label: 'All vehicles' },
          { value: 'ev', label: 'EV' },
          { value: 'bicycle', label: 'Bicycle' },
        ]} />
      </div>

      {error && <ErrorNote message={error} />}

      {items === null ? <Loading /> : items.length === 0 ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
          <UserCheck className="w-10 h-10 text-inv-muted mb-3" />
          <p className="font-semibold text-inv-text">No applications here</p>
          <p className="text-sm text-inv-muted mt-1">Try another status or vehicle.</p>
        </div>
      ) : (
        <ul className="grid lg:grid-cols-2 gap-6">
          {items.map((a) => (
            <ApplicationCard key={a.id} app={a}
              assets={assets.filter((x) => x.asset_type === a.asset_type)}
              action={action?.id === a.id ? action : null}
              onAction={(kind) => setAction(kind ? { id: a.id, kind } : null)}
              onDone={() => { setAction(null); load() }} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ApplicationCard({ app, assets, action, onAction, onDone }: {
  app: Application
  assets: AssetRow[]
  action: Action | null
  onAction: (kind: Action['kind'] | null) => void
  onDone: () => void
}) {
  const open = app.status === 'submitted' || app.status === 'contacted'
  const [note, setNote] = useState('')
  const [assetId, setAssetId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!action) return
    if (action.kind === 'approve' && !assetId) { setError('Choose the asset this driver will ride.'); return }
    setBusy(true)
    setError('')
    try {
      const n = note.trim() || undefined
      if (action.kind === 'contact') await contactApplication(app.id, n)
      else if (action.kind === 'reject') await rejectApplication(app.id, n)
      else await approveApplication(app.id, assetId, n)
      setNote('')
      setAssetId('')
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That didn’t go through.')
    } finally {
      setBusy(false)
    }
  }

  const detail = (Icon: typeof Phone, text: string | null) => text && (
    <p className="flex items-center gap-2 text-sm text-inv-text"><Icon className="w-4 h-4 text-inv-muted shrink-0" />{text}</p>
  )

  return (
    <li className="rounded-3xl bg-inv-surface border border-inv-line p-6 flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-inv-text">{app.full_name}</p>
          <p className="text-sm text-inv-muted">
            {app.asset_type === 'ev' ? 'EV' : 'Bicycle'} · applied {shortDate(app.created_at)}
            {app.already_driver && ' · already a driver'}
          </p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_TONE[app.status]}`}>{label(app.status)}</span>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-2">
        {detail(Phone, app.phone)}
        {detail(Mail, app.email)}
        {detail(MapPin, app.area)}
        {detail(IdCard, `NIN ${app.nin}`)}
      </div>

      <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {app.license_number && <><dt className="text-inv-muted">Licence</dt><dd className="text-inv-text">{app.license_number}</dd></>}
        {app.guarantor_name && <><dt className="text-inv-muted">Guarantor</dt><dd className="text-inv-text">{app.guarantor_name}{app.guarantor_phone && ` · ${app.guarantor_phone}`}</dd></>}
      </dl>
      {app.experience && <p className="mt-3 text-sm text-inv-muted leading-relaxed">{app.experience}</p>}
      {app.admin_note && (
        <p className="mt-3 text-sm rounded-2xl bg-inv-soft px-4 py-3 text-inv-text"><span className="font-semibold">Note: </span>{app.admin_note}</p>
      )}

      {open && !action && (
        <div className="mt-5 pt-5 border-t border-inv-line flex flex-wrap gap-2">
          {app.status === 'submitted' && (
            <button onClick={() => onAction('contact')} className="px-4 py-2 rounded-full border border-inv-line text-sm font-semibold text-inv-text hover:bg-inv-soft cursor-pointer">
              Mark contacted
            </button>
          )}
          <button onClick={() => onAction('approve')} className="px-4 py-2 rounded-full bg-linear-to-r from-[#ff923e] to-[#c46018] text-white text-sm font-semibold cursor-pointer">
            Approve
          </button>
          <button onClick={() => onAction('reject')} className="px-4 py-2 rounded-full text-sm font-semibold text-red-600 hover:bg-red-500/10 cursor-pointer">
            Reject
          </button>
        </div>
      )}

      {action && (
        <div className="mt-5 pt-5 border-t border-inv-line space-y-3">
          <p className="text-sm font-semibold text-inv-text">
            {action.kind === 'approve' ? 'Approve and assign an asset' : action.kind === 'reject' ? 'Reject this application' : 'Mark as contacted'}
          </p>
          {action.kind === 'approve' && (
            assets.length === 0
              ? <p className="text-sm text-amber-700">No {app.asset_type === 'ev' ? 'EV' : 'bicycle'} is free. An asset must be acquiring or active with no driver.</p>
              : (
                <select value={assetId} onChange={(e) => setAssetId(e.target.value)} aria-label="Asset"
                  className="w-full px-4 py-3 rounded-xl border border-inv-line bg-inv-surface text-inv-text">
                  <option value="">Choose an asset…</option>
                  {assets.map((x) => (
                    <option key={x.asset_id} value={x.asset_id}>{x.code} · {x.vehicle_name ?? x.plan} · {label(x.status)}</option>
                  ))}
                </select>
              )
          )}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note (optional)" aria-label="Note"
            className="w-full px-4 py-3 rounded-xl border border-inv-line bg-inv-surface text-inv-text placeholder:text-inv-muted/60" />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy || (action.kind === 'approve' && assets.length === 0)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer disabled:opacity-40 ${
                action.kind === 'reject' ? 'bg-red-600 text-white' : 'bg-linear-to-r from-[#ff923e] to-[#c46018] text-white'}`}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {action.kind === 'approve' ? 'Approve' : action.kind === 'reject' ? 'Reject' : 'Mark contacted'}
            </button>
            <button onClick={() => { setError(''); onAction(null) }} disabled={busy}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-inv-muted hover:bg-inv-soft cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
