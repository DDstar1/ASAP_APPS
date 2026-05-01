import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type VendorRow = {
  id: number
  user_id: string | null
  name: string
  address: string
  open_time: string
  close_time: string
  lat: number
  lng: number
  allows_logistics: boolean
  acct_type: 'vendor' | 'Handy-man' | 'service-provider'
  phone: string
  email: string
  message_body: string | null
  acct_details: Record<string, unknown> | null
  order_history: unknown[]
  created_at: string
  updated_at: string
}

export type MenuRow = {
  id: number
  vendor_id: number
  category_name: string
}

export type ItemRow = {
  id: number
  vendor_id: number | null
  image_url: string | null
  name: string
  menu_id: number | null
  price: number
  stock: number
}

export type OrderRow = {
  id: number
  zazu_sub_name: string | null
  user_id: number | null
  vendor_id: number | null
  status: 'pending' | 'paid' | 'in_progress' | 'delivered' | 'cancelled'
  subtotal: number
  delivery_fee: number
  total: number
  created_at: string
  updated_at: string
}

export type CustomerRow = {
  id: number
  telegram_user_id: number
  name: string
  phone: string
}
