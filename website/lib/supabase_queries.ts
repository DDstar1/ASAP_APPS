import { supabase } from '@/lib/supabase'
import type { ItemRow, OrderRow, NotificationRow } from '@/lib/supabase'

// ─── Auth ────────────────────────────────────────────────────────────────────

export function getSession() {
  return supabase.auth.getSession()
}

export function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}

// ─── App users ────────────────────────────────────────────────────────────────

// Signup's only profile write. Driver / vendor / investor rows are added later
// under the same user id.
export function insertAppUser(id: string, username: string) {
  return supabase.from('app_custom_users').insert({ id, username })
}

export type MyAccess = { profile: boolean; driver: boolean; vendor_ids: number[] }

// Which panels to offer the signed-in user; RLS still guards the data
export async function getMyAccess() {
  const { data, error } = await supabase.rpc('my_access')
  return { data: data as MyAccess | null, error }
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export function getVendorByEmail(email: string) {
  return supabase.from('telegram_vendor').select('*').eq('email', email).single()
}

export function getVendorIdByEmail(email: string) {
  return supabase.from('telegram_vendor').select('id').eq('email', email).single()
}

export function getVendorsByUserId(userId: string) {
  return supabase
    .from('telegram_vendor')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
}

// RLS hides other vendors' stores, so uniqueness is asked of the database.
// data is true when the name is taken.
export function checkVendorNameExists(name: string) {
  return supabase.rpc('vendor_name_taken', { p_name: name })
}

export function insertVendor(payload: {
  name: string
  email: string
  phone: string
  address: string
  open_time: string
  close_time: string
  lat: number
  lng: number
  acct_type: 'vendor' | 'Handy-man' | 'service-provider'
  acct_details: { bank_account_number: string; bank_code: string }
  guidelines_accepted_at: string // required by RLS for every new store
}) {
  return supabase.from('telegram_vendor').insert(payload)
}

// Settings and the bot's welcome message. The database refuses a location
// change while orders are open, and Logistics outside coverage (P0001, with a
// message meant for the vendor).
export function updateVendor(
  id: number,
  payload: Partial<{
    name: string
    phone: string
    address: string
    open_time: string
    close_time: string
    lat: number
    lng: number
    allows_logistics: boolean
    message_body: string | null
    acct_details: { bank_account_number: string; bank_code: string }
  }>,
) {
  return supabase.from('telegram_vendor').update(payload).eq('id', id).select('*').single()
}

// Soft delete; refused while the store has open orders or pending refunds
export function deleteStore(vendorId: number) {
  return supabase.rpc('delete_store', { p_vendor: vendorId })
}

// Inside an active service area (service_areas, Abuja for now). The same
// check guards create_order, Logistics and Zazu.
export function checkInServiceArea(lat: number, lng: number) {
  return supabase.rpc('in_service_area', { p_lat: lat, p_lng: lng })
}

// ─── Account ──────────────────────────────────────────────────────────────────

export function updatePassword(password: string) {
  return supabase.auth.updateUser({ password })
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export function checkDriverEmailExists(email: string) {
  return supabase.from('back_drivers').select('driver_id').eq('email', email).single()
}

export function insertDriver(payload: {
  driver_id: string
  name: string
  email: string
  phone: string
  license_number: string
  vehicle_type: string
  vehicle: string
  account_number: string
  bank_code: string
}) {
  return supabase.from('back_drivers').insert({
    ...payload,
    status: 'available',
    driver_pubkey: {},
    driver_location: {},
    driver_response: {},
  })
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function getVendorCategories(vendorId: number) {
  return supabase
    .from('telegram_vendor_menu')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('category_name')
}

export function insertCategory(vendorId: number, categoryName: string) {
  return supabase.from('telegram_vendor_menu').insert({ vendor_id: vendorId, category_name: categoryName })
}

export function deleteCategory(id: number) {
  return supabase.from('telegram_vendor_menu').delete().eq('id', id)
}

// ─── Items ────────────────────────────────────────────────────────────────────

export function getVendorItems(vendorId: number) {
  return supabase
    .from('telegram_vendor_item')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('id', { ascending: false })
}

export function getVendorItemIds(vendorId: number) {
  return supabase.from('telegram_vendor_item').select('id').eq('vendor_id', vendorId)
}

export function getVendorItemIdAndMenu(vendorId: number) {
  return supabase.from('telegram_vendor_item').select('id, menu_id').eq('vendor_id', vendorId)
}

export function insertItem(payload: Omit<ItemRow, 'id'>) {
  return supabase.from('telegram_vendor_item').insert(payload)
}

export function updateItem(id: number, payload: Partial<Omit<ItemRow, 'id'>>) {
  return supabase.from('telegram_vendor_item').update(payload).eq('id', id)
}

export function deleteItem(id: number) {
  return supabase.from('telegram_vendor_item').delete().eq('id', id)
}

export function updateItemStock(id: number, stock: number) {
  return supabase.from('telegram_vendor_item').update({ stock }).eq('id', id)
}

export async function uploadItemImage(vendorId: number, file: File, itemName: string): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${vendorId}/${Date.now()}-${itemName.replace(/\s+/g, '-')}.${ext}`
  // Paths are unique per upload; upsert would also need a SELECT policy on the bucket
  const { error } = await supabase.storage.from('vendor-item-images').upload(path, file)
  if (error) return null
  const { data } = supabase.storage.from('vendor-item-images').getPublicUrl(path)
  return data.publicUrl
}

// ─── Orders (telegram) ────────────────────────────────────────────────────────

// * includes what Zazu writes onto the order (items, driver_name,
// driver_phone, customer_phone, pickup_code, eta)
export function getVendorOrders(vendorId: number) {
  return supabase
    .from('telegram_orders')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
}

// The vendor's only order write: Accept, or Can't fulfil (cancels + queues
// Zazu's refund). Errors with P0001 once the order is past changing.
export function respondToOrder(orderId: number, accept: boolean) {
  return supabase.rpc('vendor_respond_order', { p_order: orderId, p_accept: accept })
}

// Cancelled-on-your-side orders since the bot was last reinstated
export function getVendorStrikes(vendorId: number) {
  return supabase.rpc('vendor_strikes', { p_vendor: vendorId })
}

// Distinct customers with a paid order (active in each period), and how many
// are new (first order in the period). Counts only; no customer data leaves the DB.
// prev* is the same count for the period just before (null for all time).
export type StatsPeriod = 'day' | 'week' | 'month' | 'year' | 'all'
export type CustomerStats = Record<StatsPeriod, {
  customers: number; new: number; prevCustomers: number | null; prevNew: number | null
}>

export async function getVendorCustomerStats(vendorId: number) {
  const { data, error } = await supabase.rpc('vendor_customer_stats', { p_vendor: vendorId })
  const r = (data as Record<string, number | string>[] | null)?.[0]
  if (!r) return { error, data: null }
  const n = (k: string) => Number(r[k] ?? 0)
  const period = (p: 'day' | 'week' | 'month' | 'year') => ({
    customers: n(`customers_${p}`), new: n(`new_${p}`),
    prevCustomers: n(`customers_${p}_prev`), prevNew: n(`new_${p}_prev`),
  })
  const stats: CustomerStats = {
    day: period('day'),
    week: period('week'),
    month: period('month'),
    year: period('year'),
    // All time: every customer was new once; nothing to compare against
    all: { customers: n('customers_all'), new: n('customers_all'), prevCustomers: null, prevNew: null },
  }
  return { error, data: stats }
}

export function updateOrderStatus(orderId: number, status: OrderRow['status']) {
  return supabase
    .from('telegram_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
}

export function getCustomersByTelegramIds(userIds: number[]) {
  return supabase
    .from('telegram_custom_users')
    .select('id, telegram_user_id, name, phone')
    .in('telegram_user_id', userIds)
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function getVendorNotifications(vendorId: number, limit = 50) {
  return supabase
    .from('vendor_notifications')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(limit)
}

export function markNotificationsRead(vendorId: number) {
  return supabase
    .from('vendor_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('vendor_id', vendorId)
    .is('read_at', null)
}

export function markNotificationRead(id: number) {
  return supabase
    .from('vendor_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
}

// New rows for one store as they're written; returns the unsubscribe
export function onVendorNotification(vendorId: number, onInsert: (row: NotificationRow) => void) {
  const channel = supabase
    .channel(`vendor-notifications-${vendorId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'vendor_notifications', filter: `vendor_id=eq.${vendorId}` },
      (payload) => onInsert(payload.new as NotificationRow),
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

// ─── Billing ──────────────────────────────────────────────────────────────────
// Reads only; payments go through /api/billing/*, never the browser

export function getBillingPlans() {
  return supabase
    .from('billing_plans')
    .select('id, name, description, features, amount, list_amount, interval, sort')
    .order('sort')
}

export function getBillingSubscription(vendorId: number) {
  return supabase
    .from('billing_subscriptions')
    .select('vendor_id, plan_id, method, status, period_end, card_brand, card_last4, card_exp')
    .eq('vendor_id', vendorId)
    .maybeSingle()
}

export function getBillingPayments(vendorId: number) {
  return supabase
    .from('billing_payments')
    .select('id, plan_id, reference, amount, channel, status, paid_at, created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(50)
}

// ─── Telegram bots ────────────────────────────────────────────────────────────

// Bots are assigned server-side; bot_token is never selected (and not granted)
export function getVendorBot(vendorId: number) {
  return supabase
    .from('telegram_bots')
    .select('id, bot_id, bot_username, bot_link, vendor_id, is_active, suspended_at, billing_paused_at, created_at')
    .eq('vendor_id', vendorId)
    .maybeSingle()
}

export function insertBot(payload: { bot_id: number; bot_username: string; bot_token: string; vendor_id: number }) {
  return supabase.from('telegram_bots').insert(payload)
}

// The vendor names their bot; it's paired without one
export function updateBotUsername(id: number, bot_username: string) {
  return supabase.from('telegram_bots').update({ bot_username }).eq('id', id)
}

export function updateBotActive(id: number, is_active: boolean) {
  return supabase.from('telegram_bots').update({ is_active }).eq('id', id)
}

// ─── Delivery orders (app) ────────────────────────────────────────────────────

export function getUserDeliveryOrders(userId: string) {
  return supabase
    .from('app_delivery_orders')
    .select('id, status, created_at, pickup_name, dropoff_name')
    .eq('client_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
}
