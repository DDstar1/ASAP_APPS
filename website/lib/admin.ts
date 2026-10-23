import { rust } from '@/lib/rust'

// Admin panel (app/admin). Every call goes to Rust, which checks back_admins on each one
// (401 signed out, 403 not an admin); the website's gate is only for showing the right screen.

export type AdminRole = 'superior' | 'admin'
export type Me = { user_id: string; role: AdminRole }

export const getMe = () => rust<Me>('/admin/me', undefined, 'GET')

// ---------- Periods ----------

// Rust's presets; anything else is sent as from/to (Lagos days, both ends included, at most 2 years)
export type PresetPeriod = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month'
export type Period = { preset: PresetPeriod } | { from: string; to: string }

export const PRESETS: { value: PresetPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
]

// Longer windows ending today, sent as from/to since Rust has no preset for them
export const RANGES: { months: number; label: string }[] = [
  { months: 3, label: '3 months' },
  { months: 6, label: '6 months' },
  { months: 12, label: '1 year' },
  { months: 24, label: '2 years' },
]

// Today's date in Lagos as YYYY-MM-DD, matching how Rust counts days
export function lagosToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date())
}

export function monthsBack(months: number): Period {
  const to = lagosToday()
  const d = new Date(`${to}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - months)
  d.setUTCDate(d.getUTCDate() + 1)
  return { from: d.toISOString().slice(0, 10), to }
}

export function periodQuery(p: Period) {
  return 'preset' in p ? `period=${p.preset}` : `from=${p.from}&to=${p.to}`
}

export function samePeriod(a: Period, b: Period) {
  return periodQuery(a) === periodQuery(b)
}

// ---------- Dashboard ----------

// Every dashboard reply. refresh_secs is null once the period is wholly in the past: stop polling.
export type Envelope<T> = {
  period: { from: string; to: string; days: number } | null
  generated_at: string
  refresh_secs: number | null
  data: T
}

export type Live = {
  drivers: { available: number; busy: number; offline: number; location_stale: number }
  online_sessions: number
  orders: Record<string, number>
  returning: number
  payouts: { awaiting: number; failed: number }
  queues: {
    disputes: number
    dispute_refunds_failed: number
    transfers: number
    applications: number
    withdrawals: number
    purchases_open: number
  }
}

export type Overview = {
  orders: { created: number; by_status: Record<string, number>; by_source: Record<string, number> }
  deliveries: { count: number; app_charged_naira: number; insurance_naira: number }
  cancellations: { total: number; by_customer: number; by_driver: number; by_system: number; after_pickup: number }
  trips: {
    completed: number; cancelled: number; distance_km: number
    gross_fares_kobo: number; driver_earnings_kobo: number; asset_pool_kobo: number; treasury_kobo: number
    online_minutes: number; active_drivers: number
  }
  offers: { received: number; accepted: number; rejected: number; expired: number }
  disputes: { raised: number; pending: number; upheld: number; rejected: number }
  users: { new: number }
  applications: Record<string, number>
  invest: {
    purchases: { count: number; slots: number; amount_kobo: number }
    withdrawals_requested: { count: number; amount_kobo: number }
    withdrawals_paid: { count: number; amount_kobo: number }
    earnings_credited_kobo: number
  }
}

export type Metric = 'orders' | 'revenue' | 'trips' | 'cancellations'
export type Bucket = 'hour' | 'day' | 'week' | 'month'
export type Series = { metric: Metric; bucket: Bucket; series: { t: string; value: number }[] }

export type DriverSort = 'trips' | 'earnings' | 'online' | 'acceptance' | 'disputes'
export type DriverRow = {
  driver_id: string; name: string; phone: string | null; vehicle_type: string | null; status: string
  tier: string | null; plate_number: string | null; current_asset: string | null
  offers_received: number; offers_accepted: number; offers_rejected: number; offers_expired: number
  acceptance_rate: number | null
  trips_completed: number; trips_cancelled: number; distance_km: number
  gross_fares_kobo: number; driver_earnings_kobo: number
  disputes_raised: number; disputes_upheld: number; disputes_rejected: number
  online_minutes: number; on_trip_minutes: number; utilisation: number | null; active_days: number
  rank: number
}

export type AssetRow = {
  asset_id: string; code: string; status: string; vehicle_name: string | null; plate_number: string | null
  plan: string; asset_type: string; funding_ends_at: string | null; activated_at: string | null
  slots: { open: number; investor: number; business: number }
  current_driver: string | null
  trips_completed: number; distance_km: number; gross_fares_kobo: number; investor_pool_kobo: number
  online_minutes: number; drivers: number; active_days: number
}

const dash = <T>(path: string) => rust<Envelope<T>>(`/admin/dashboard/${path}`, undefined, 'GET')

export const getLive = () => dash<Live>('live')
export const getOverview = (p: Period) => dash<Overview>(`overview?${periodQuery(p)}`)
export const getSeries = (p: Period, metric: Metric, bucket: Bucket) =>
  dash<Series>(`timeseries?${periodQuery(p)}&metric=${metric}&bucket=${bucket}`)
export const getDrivers = (p: Period, sort: DriverSort) =>
  dash<{ drivers: DriverRow[] }>(`drivers?${periodQuery(p)}&sort=${sort}`)
export const getAssets = (p: Period) => dash<{ assets: AssetRow[] }>(`assets?${periodQuery(p)}`)

// ---------- Driver applications ----------

export type ApplicationStatus = 'submitted' | 'contacted' | 'approved' | 'rejected'
export type Application = {
  id: number; user_id: string; asset_type: string; full_name: string; phone: string; email: string | null
  area: string; nin: string; license_number: string | null; experience: string | null
  guarantor_name: string | null; guarantor_phone: string | null; status: ApplicationStatus
  admin_note: string | null; contacted_at: string | null; decided_at: string | null; decided_by: string | null
  created_at: string; already_driver: boolean
}

// status null: the open ones (submitted and contacted)
export function getApplications(status: ApplicationStatus | null, assetType: string | null) {
  const q = new URLSearchParams()
  if (status) q.set('status', status)
  if (assetType) q.set('asset_type', assetType)
  return rust<{ applications: Application[] }>(`/admin/applications?${q}`, undefined, 'GET')
}

export const contactApplication = (id: number, note?: string) => rust(`/admin/applications/${id}/contact`, { note })
export const rejectApplication = (id: number, note?: string) => rust(`/admin/applications/${id}/reject`, { note })
export const approveApplication = (id: number, assetId: string, note?: string) =>
  rust<{ driver_id: string; asset_code: string }>(`/admin/applications/${id}/approve`, { asset_id: assetId, note })

// ---------- Disputes ----------

export type DisputeStatus = 'pending' | 'upheld' | 'rejected'
export type Dispute = {
  id: number; order_id: number; order_code: string; source: string; reason: string; photo_url: string
  driver_note: string | null; driver_id: string; driver_name: string; driver_disputes: number
  package_description: string | null; package_type: string | null
  status: DisputeStatus; refund_status: string | null; created_at: string
}

export const getDisputes = (status: DisputeStatus) =>
  rust<{ disputes: Dispute[] }>(`/admin/disputes?status=${status}`, undefined, 'GET')

// penaltyKobo is required when the driver is at fault (0 for a warning)
export const reviewDispute = (id: number, driverAtFault: boolean, penaltyKobo: number | null, note?: string) =>
  rust<{ status: string; refund_amount: number; refund_status: string }>(`/admin/disputes/${id}/review`, {
    driver_at_fault: driverAtFault, penalty: driverAtFault ? penaltyKobo : null, note,
  })

// ---------- Admins ----------

export type AdminEntry = { user_id: string; email: string; role: AdminRole; granted_by: string | null; granted_at: string }

export const getAdmins = () => rust<{ admins: AdminEntry[] }>('/admin/admins', undefined, 'GET')
export const grantAdmin = (email: string) => rust<{ user_id: string; role: 'admin' }>('/admin/admins', { email })
export const revokeAdmin = (userId: string) => rust(`/admin/admins/${userId}`, undefined, 'DELETE')

// ---------- Formatting ----------

export function minutesLabel(min: number) {
  const m = Math.round(min)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h.toLocaleString('en-NG')}h ${m % 60}m` : `${h.toLocaleString('en-NG')}h`
}

export const count = (n: number) => Math.round(n).toLocaleString('en-NG')

export const ratio = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`)

export const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
