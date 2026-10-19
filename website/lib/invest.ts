import { supabase } from '@/lib/supabase'
import { rust, RustError } from '@/lib/rust'

export { RustError }

// ASAP Invest. The website reads its own rows straight from Supabase (RLS
// limits every table to the signed-in investor); every money or asset write
// (buy a slot, verify it, withdraw) goes through Rust. The only direct writes
// are marking a notification or a news message read.

// ─── Types (money is kobo) ─────────────────────────────────────────────────────

export type AssetType = 'ev' | 'bicycle'

export type InvestPlan = {
  id: number
  name: string
  description: string | null
  asset_type: AssetType
  total_slots: number
  slot_price: number
  asset_price?: number
  investor_pct: number
  funding_days: number
  sort: number
}

export type OpenAsset = {
  asset_id: string
  code: string
  plan_id: number
  total_slots: number
  open_slots: number
  funding_ends_at: string
}

export type AssetStatus = 'funding' | 'acquiring' | 'active' | 'retired'

export type InvestAsset = {
  id: string
  code: string
  plan_id: number
  status: AssetStatus
  vehicle_name: string | null
  plate_number: string | null
  funding_ends_at: string
  acquired_at: string | null
  activated_at: string | null
  retired_at: string | null
  created_at: string
}

export type InvestSlot = {
  id: number
  asset_id: string
  slot_no: number
  slot_pct: number | null
  price_paid: number | null
  acquired_at: string | null
}

export type WeeklyStat = {
  asset_id: string
  week_start: string
  trips: number
  distance_km: number
  gross_fares: number
  investor_pool: number
  active_days: number
  active_hours: number
}

export type Earning = {
  id: number
  slot_id: number
  asset_id: string
  week_start: string
  amount: number
}

export type Wallet = { earned: number; withdrawn: number; balance: number }

export type WithdrawalStatus = 'pending' | 'processing' | 'paid' | 'failed'

export type Withdrawal = {
  id: number
  amount: number
  status: WithdrawalStatus
  reference: string | null
  failure: string | null
  requested_at: string
  paid_at: string | null
}

export type InvestNotificationKind =
  | 'slot_secured' | 'funding_complete' | 'asset_active' | 'asset_inactive'
  | 'weekly_update' | 'withdrawal_paid' | 'withdrawal_failed'
  | 'transfer_approved' | 'transfer_rejected'
  | 'pin_locked' | 'pin_changed' | 'bank_details_changed'

export type InvestNotification = {
  id: number
  kind: InvestNotificationKind
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export type InvestMessage = {
  id: number
  title: string
  body: string
  published_at: string
  read: boolean
}

// ─── Formatting ────────────────────────────────────────────────────────────────

export function naira(kobo: number, decimals = 0) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Each slot's cut of every fare, e.g. 14% over 4 slots = 3.5%
export function slotPct(plan: Pick<InvestPlan, 'investor_pct' | 'total_slots'>) {
  return Number(plan.investor_pct) / plan.total_slots
}

export function pct(n: number) {
  return `${Number(n.toFixed(2))}%`
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function weekLabel(weekStart: string) {
  return 'Week of ' + new Date(weekStart + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

// ─── Reads ─────────────────────────────────────────────────────────────────────

export function getInvestPlans() {
  return supabase.from('invest_plans').select('*').order('sort').order('id')
}

export async function getInvestPlan(id: number) {
  const { data, error } = await supabase.from('invest_plans').select('*').eq('id', id).maybeSingle()
  return { data: data as InvestPlan | null, error }
}

export async function getOpenAssets() {
  const { data, error } = await supabase.rpc('invest_open_assets')
  return { data: (data ?? []) as OpenAsset[], error }
}

// Includes assets the investor used to hold (they keep the history)
export async function getMyAssets() {
  const { data, error } = await supabase.from('invest_assets')
    .select('*, plan:invest_plans(name, asset_type, total_slots, investor_pct)')
    .order('created_at', { ascending: false })
  return { data: (data ?? []) as InvestAssetWithPlan[], error }
}

export async function getMyAsset(id: string) {
  const { data, error } = await supabase.from('invest_assets')
    .select('*, plan:invest_plans(name, asset_type, total_slots, investor_pct)')
    .eq('id', id).maybeSingle()
  return { data: data as InvestAssetWithPlan | null, error }
}

export function getAssetWeeklyStats(assetId: string) {
  return supabase.from('invest_weekly_stats').select('*')
    .eq('asset_id', assetId).order('week_start', { ascending: false })
}

export type InvestAssetWithPlan =InvestAsset & {
  // null when the plan has since been switched off (plans RLS shows active only)
  plan: Pick<InvestPlan, 'name' | 'asset_type' | 'total_slots' | 'investor_pct'> | null
}

// Plan rows can be hidden (inactive), so fall back to the code's prefix (EV-…)
export function assetType(asset: InvestAssetWithPlan): AssetType {
  return asset.plan?.asset_type ?? (asset.code.toUpperCase().startsWith('EV') ? 'ev' : 'bicycle')
}

export function getMySlots(userId: string) {
  return supabase.from('invest_slots')
    .select('id, asset_id, slot_no, slot_pct, price_paid, acquired_at')
    .eq('owner_id', userId)
    .order('acquired_at', { ascending: false })
}

export function getWeeklyStats(weeks = 12) {
  // Enough rows for `weeks` weeks of every asset the investor can see
  return supabase.from('invest_weekly_stats').select('*')
    .order('week_start', { ascending: false })
    .limit(weeks * 50)
}

export function getEarnings(userId: string) {
  return supabase.from('invest_earnings')
    .select('id, slot_id, asset_id, week_start, amount')
    .eq('owner_id', userId)
    .order('week_start', { ascending: false })
}

export type TripEarning = {
  id: number
  trip_id: string
  asset_id: string
  trip_ended_at: string
  distance_km: number
  fare: number
  owner_pct: number
}

export function tripShare(t: Pick<TripEarning, 'fare' | 'owner_pct'>) {
  return Math.floor((t.fare * Number(t.owner_pct)) / 100)
}

export function getTripEarnings(userId: string, weekStart: string) {
  return supabase.from('invest_trip_earnings')
    .select('id, trip_id, asset_id, trip_ended_at, distance_km, fare, owner_pct')
    .eq('owner_id', userId).eq('week_start', weekStart)
    .order('trip_ended_at', { ascending: false })
}

export function isoWeek(weekStart: string) {
  const d = new Date(weekStart + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 3)
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7)
}

export function weekRange(weekStart: string) {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`
}

export async function getWallet(userId: string) {
  const { data, error } = await supabase.from('invest_wallet')
    .select('earned, withdrawn, balance').eq('user_id', userId).maybeSingle()
  const wallet: Wallet = {
    earned: Number(data?.earned ?? 0),
    withdrawn: Number(data?.withdrawn ?? 0),
    balance: Number(data?.balance ?? 0),
  }
  return { data: wallet, error }
}

export function getWithdrawals(userId: string) {
  return supabase.from('invest_withdrawals')
    .select('id, amount, status, reference, failure, requested_at, paid_at')
    .eq('owner_id', userId)
    .order('requested_at', { ascending: false })
}

export function getInvestNotifications(userId: string) {
  return supabase.from('invest_notifications')
    .select('id, kind, data, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
}

export function markInvestNotificationsRead(ids: number[]) {
  return supabase.from('invest_notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)
    .is('read_at', null)
}

export async function getInvestMessages(userId: string) {
  const [messages, reads] = await Promise.all([
    supabase.from('invest_messages').select('id, title, body, published_at')
      .order('published_at', { ascending: false }).limit(50),
    supabase.from('invest_message_reads').select('message_id').eq('user_id', userId),
  ])
  const read = new Set((reads.data ?? []).map((r) => r.message_id as number))
  const data = ((messages.data ?? []) as Omit<InvestMessage, 'read'>[])
    .map((m) => ({ ...m, read: read.has(m.id) }))
  return { data, error: messages.error ?? reads.error }
}

// Sidebar badges
export async function getInvestUnread(userId: string) {
  const [notifications, messages, reads] = await Promise.all([
    supabase.from('invest_notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).is('read_at', null),
    supabase.from('invest_messages').select('id', { count: 'exact', head: true }),
    supabase.from('invest_message_reads').select('message_id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  return {
    notifications: notifications.count ?? 0,
    messages: Math.max(0, (messages.count ?? 0) - (reads.count ?? 0)),
  }
}

export function markInvestMessageRead(messageId: number, userId: string) {
  // Already-read rows hit the primary key; that's fine
  return supabase.from('invest_message_reads').insert({ message_id: messageId, user_id: userId })
}

// ─── Rust (writes) ─────────────────────────────────────────────────────────────

export type Purchase = {
  reference: string
  checkout_url: string
  asset_code: string
  slots: number
  amount: number
  hold_minutes: number
}

export type PurchaseStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'refunded'

export const PENDING_PURCHASE_KEY = 'asap-invest-pending-purchase'

// Holds the slot(s) for 30 minutes and opens a Korapay checkout
export function startPurchase(assetId: string, slots: number, redirectUrl: string) {
  return rust<Purchase>('/invest/purchases', { asset_id: assetId, slots, redirect_url: redirectUrl })
}

export function verifyPurchase(reference: string) {
  return rust<{ reference: string; status: PurchaseStatus }>(`/invest/purchases/${encodeURIComponent(reference)}/verify`)
}

// No amount withdraws the whole balance. Once per month.
export function requestWithdrawal(pin: string, amount?: number) {
  return rust<{ id: number; amount: number; status: 'pending' }>('/invest/withdrawals', amount === undefined ? { pin } : { pin, amount })
}

export const PIN_LENGTH = 4

// 409 = a PIN already exists
export function createPin(pin: string) {
  return rust<{ pin_set: true }>('/invest/pin', { pin })
}

// 403 = wrong or locked current PIN
export function changePin(currentPin: string, newPin: string) {
  return rust<{ pin_set: true }>('/invest/pin', { current_pin: currentPin, new_pin: newPin }, 'PUT')
}

export type BankDetails = { bank_code: string; bank_account_number: string }

export async function getBankDetails(userId: string) {
  const { data, error } = await supabase.from('invest_accounts').select('acct_details').eq('user_id', userId).maybeSingle()
  return { data: (data?.acct_details ?? null) as BankDetails | null, error }
}

// 403 = no PIN yet, wrong PIN or locked
export async function saveBankDetails(accountNumber: string, bankCode: string, pin: string) {
  const reply = await rust<{ acct_details: BankDetails }>('/invest/bank-details',
    { account_number: accountNumber, bank_code: bankCode, pin }, 'PUT')
  return reply.acct_details
}
