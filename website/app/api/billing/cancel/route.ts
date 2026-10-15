import { applyEvent, BillingError, errorResponse, paystack, paystackCodes, requireVendor } from '@/lib/billing-server'

// Stops future card charges. What's been paid for runs to period_end.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { vendorId?: unknown }
    const { vendor } = await requireVendor(body.vendorId)
    const codes = await paystackCodes(vendor.id)
    if (!codes?.subscription_code || !codes.email_token) {
      throw new BillingError('There’s no card subscription to cancel.', 404)
    }

    await paystack('/subscription/disable', {
      method: 'POST',
      body: { code: codes.subscription_code, token: codes.email_token },
    })
    // The webhook says the same; recording it now updates the page at once
    await applyEvent('subscription.disable', { subscription_code: codes.subscription_code, status: 'cancelled' })
    return Response.json({ ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}
