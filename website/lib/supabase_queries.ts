import { supabase } from '@/lib/supabase'
import type { ItemRow, OrderRow } from '@/lib/supabase'

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

export function insertAppUser(id: string, username: string) {
  return supabase.from('app_custom_users').insert({ id, username })
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export function getVendorByEmail(email: string) {
  return supabase.from('telegram_vendor').select('*').eq('email', email).single()
}

export function getVendorIdByEmail(email: string) {
  return supabase.from('telegram_vendor').select('id').eq('email', email).single()
}

export function checkVendorNameExists(name: string) {
  return supabase.from('telegram_vendor').select('id').eq('name', name).single()
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
}) {
  return supabase.from('telegram_vendor').insert(payload)
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
  const { error } = await supabase.storage.from('vendor-item-images').upload(path, file, { upsert: true })
  if (error) return null
  const { data } = supabase.storage.from('vendor-item-images').getPublicUrl(path)
  return data.publicUrl
}

// ─── Orders (telegram) ────────────────────────────────────────────────────────

export function getVendorOrders(vendorId: number) {
  return supabase
    .from('telegram_orders')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
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

// ─── Delivery orders (app) ────────────────────────────────────────────────────

export function getUserDeliveryOrders(userId: string) {
  return supabase
    .from('app_delivery_orders')
    .select('id, status, created_at, pickup_name, dropoff_name')
    .eq('client_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
}
