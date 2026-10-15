import { applyEvent, validSignature } from '@/lib/billing-server'

// Paystack → Dashboard → Settings → API Keys & Webhooks:
//   https://<website>/api/billing/webhook
// A non-2xx answer makes Paystack retry, which covers events that arrive
// before the one they depend on.
export async function POST(request: Request) {
  const raw = await request.text()
  if (!validSignature(raw, request.headers.get('x-paystack-signature'))) {
    return new Response('Bad signature', { status: 401 })
  }

  let event: { event?: string; data?: unknown }
  try {
    event = JSON.parse(raw)
  } catch {
    return new Response('Bad body', { status: 400 })
  }
  if (!event.event || !event.data) return new Response('ok')

  try {
    await applyEvent(event.event, event.data)
    return new Response('ok')
  } catch (err) {
    console.error(`billing webhook ${event.event}:`, err)
    return new Response('Retry', { status: 500 })
  }
}
