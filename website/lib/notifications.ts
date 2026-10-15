import { BadgeCheck, Banknote, CreditCard, PackageCheck, ShoppingBag, type LucideIcon } from 'lucide-react'
import type { NotificationRow } from '@/lib/supabase'

function formatNaira(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
}

export type NotificationView = {
  title: string
  body: string
  icon: LucideIcon
  tone: string // icon colours
}

export function describeNotification(n: NotificationRow): NotificationView {
  const order = n.order_id ? `order #${n.order_id}` : 'an order'
  switch (n.kind) {
    case 'payment':
      return {
        title: 'Payment received',
        body: `${n.amount != null ? formatNaira(n.amount) : 'A payment'} for ${order}`,
        icon: Banknote,
        tone: 'bg-emerald-500/15 text-emerald-400',
      }
    case 'new_order':
      return {
        title: 'New order',
        body: `Accept or decline ${order} within 48 hours`,
        icon: ShoppingBag,
        tone: 'bg-[#ff923e]/15 text-[#ff923e]',
      }
    case 'delivered':
      return {
        title: 'Order delivered',
        body: `The customer confirmed the drop-off code for ${order}`,
        icon: PackageCheck,
        tone: 'bg-violet-500/15 text-violet-400',
      }
    case 'subscription_failed':
      return {
        title: 'Subscription payment failed',
        body: `We couldn’t charge ${n.amount != null ? formatNaira(n.amount) : 'your plan'} to your card. Update your card to keep your store bot running`,
        icon: CreditCard,
        tone: 'bg-red-500/15 text-red-400',
      }
    case 'billing_successful':
      return {
        title: 'Subscription paid',
        body: `${n.amount != null ? `${formatNaira(n.amount)} received. ` : ''}Store is up, let’s bump the hustle`,
        icon: BadgeCheck,
        tone: 'bg-emerald-500/15 text-emerald-400',
      }
  }
}

export const isBillingNotification = (n: NotificationRow) =>
  n.kind === 'subscription_failed' || n.kind === 'billing_successful'

// Where a notification leads
export function notificationHref(n: NotificationRow) {
  return isBillingNotification(n) ? '/vendor/dashboard/billing' : '/vendor/dashboard/orders'
}

export function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} d ago`
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}
