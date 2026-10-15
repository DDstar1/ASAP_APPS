import { applyEvent, BillingError, errorResponse, paystack, requireVendor } from '@/lib/billing-server'

type Transaction = {
  status: string
  reference: string
  metadata: { vendor_id?: number; plan_id?: number; purpose?: string } | string | null
}

// Paystack sends the vendor back to Billing with ?reference=…; checking it here
// shows the payment at once instead of waiting for the webhook
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { vendorId?: unknown; reference?: unknown }
    const { vendor } = await requireVendor(body.vendorId)
    if (typeof body.reference !== 'string' || !/^[\w.-]{1,100}$/.test(body.reference)) {
      throw new BillingError('Unknown payment.')
    }

    const tx = await paystack<Transaction>(`/transaction/verify/${encodeURIComponent(body.reference)}`)
    const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : tx.metadata ?? {}
    if (Number(meta.vendor_id) !== vendor.id) throw new BillingError('Unknown payment.', 404)

    if (tx.status === 'success') await applyEvent('charge.success', { ...tx, metadata: meta })
    return Response.json({ status: tx.status })
  } catch (err) {
    return errorResponse(err)
  }
}
