import { BillingError, errorResponse, paystack, paystackCodes, requireVendor } from '@/lib/billing-server'

// Paystack's own page for changing the card on a subscription
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { vendorId?: unknown }
    const { vendor } = await requireVendor(body.vendorId)
    const codes = await paystackCodes(vendor.id)
    if (!codes?.subscription_code) throw new BillingError('There’s no card subscription to update.', 404)

    const { link } = await paystack<{ link: string }>(`/subscription/${codes.subscription_code}/manage/link`)
    return Response.json({ url: link })
  } catch (err) {
    return errorResponse(err)
  }
}
