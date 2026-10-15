import { BillingError, errorResponse, paystack, requireVendor } from '@/lib/billing-server'

// Starts a Paystack checkout for a plan.
//   card:     Paystack charges now and subscribes the card to the plan
//   transfer: a one-off bank transfer for one period (transfers can't renew)
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { vendorId?: unknown; planId?: unknown; method?: unknown }
    const { supabase, vendor } = await requireVendor(body.vendorId)
    if (body.method !== 'card' && body.method !== 'transfer') throw new BillingError('Pick card or transfer.')
    const method = body.method

    const { data: plan } = await supabase
      .from('billing_plans')
      .select('id, paystack_plan_code, amount')
      .eq('id', body.planId)
      .eq('active', true)
      .maybeSingle()
    if (!plan) throw new BillingError('That plan is no longer available.', 404)

    // A live card subscription keeps charging, so it must end before another starts
    const { data: current } = await supabase
      .from('billing_subscriptions')
      .select('method, status')
      .eq('vendor_id', vendor.id)
      .maybeSingle()
    if (current?.method === 'card' && (current.status === 'active' || current.status === 'attention')) {
      throw new BillingError('Cancel your card subscription before switching plan or paying by transfer.', 409)
    }

    const origin = new URL(request.url).origin
    const checkout = await paystack<{ authorization_url: string; reference: string }>('/transaction/initialize', {
      method: 'POST',
      body: {
        email: vendor.email,
        amount: plan.amount,
        ...(method === 'card' ? { plan: plan.paystack_plan_code, channels: ['card'] } : { channels: ['bank_transfer'] }),
        callback_url: `${origin}/vendor/dashboard/billing`,
        metadata: { vendor_id: vendor.id, plan_id: plan.id, purpose: method === 'card' ? 'subscribe' : 'transfer' },
      },
    })

    return Response.json({ url: checkout.authorization_url })
  } catch (err) {
    return errorResponse(err)
  }
}
