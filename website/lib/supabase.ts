import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Session lives in cookies (not localStorage) so proxy.ts can see it
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

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
  deleted_at: string | null // soft delete; RLS hides deleted stores
  created_at: string
  updated_at: string
}

// Written by triggers on telegram_payments / telegram_orders
export type NotificationRow = {
  id: number
  vendor_id: number
  kind: 'payment' | 'new_order' | 'delivered' | 'subscription_failed' | 'billing_successful'
  order_id: number | null
  amount: number | null // kobo: order payments and subscription charges
  read_at: string | null
  created_at: string
}

// Zazu subscription billing (Paystack). Plans are read-only; subscriptions
// and payments are written by the billing webhook only.
export type BillingPlanRow = {
  id: number
  name: string
  description: string | null
  features: string[]
  amount: number              // kobo, what's charged
  list_amount: number | null  // kobo, the undiscounted price
  interval: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannually' | 'annually'
  sort: number
}

export type BillingSubscriptionRow = {
  vendor_id: number
  plan_id: number | null
  method: 'card' | 'transfer'
  status: 'active' | 'non_renewing' | 'attention' | 'cancelled' | 'completed'
  period_end: string | null   // next card charge, or paid-through for transfers
  card_brand: string | null
  card_last4: string | null
  card_exp: string | null
}

export type BillingPaymentRow = {
  id: number
  plan_id: number | null
  reference: string
  amount: number              // kobo
  channel: string | null
  status: 'success' | 'failed'
  paid_at: string | null
  created_at: string
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
  // Written by Zazu: what was ordered, then the delivery once a rider takes it
  items: OrderItem[] | null
  driver_name: string | null
  driver_phone: string | null
  customer_phone: string | null
  pickup_code: string | null
  eta: string | null
  // Accept / Can't fulfil, and the automatic cancel-and-refund
  vendor_response: 'accepted' | 'declined' | null
  pickup_confirmed_at: string | null
  cancel_reason: 'vendor_declined' | 'vendor_no_response' | 'pickup_timeout' | null
  refund_status: 'pending' | 'refunded' | 'failed' | null
  created_at: string
  updated_at: string
}

// price is per unit, in kobo like the rest of the order
export type OrderItem = {
  name: string
  quantity: number
  price: number
}

// What the vendor sold: the items only, no delivery fee
export function itemsTotal(order: OrderRow) {
  if (!order.items) return order.subtotal
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export type CustomerRow = {
  id: number
  telegram_user_id: number
  name: string
  phone: string
}
