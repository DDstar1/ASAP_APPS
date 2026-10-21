import {
  ShieldCheck, KeyRound, Radio, ScrollText, CopyCheck, Navigation,
  HandCoins, Handshake, Route, Scale, Split, Webhook,
} from 'lucide-react'

const FEATURES = [
  { icon: ShieldCheck, title: 'Escrow-backed payments', body: 'Customers pay up front into escrow. The money is held safely until the package arrives, so nobody pays for a delivery that never happened.' },
  { icon: KeyRound, title: 'OTP delivery proof', body: 'The recipient gives the rider a one-time code at the door. No code, no completed delivery, and no arguments about who received what.' },
  { icon: Radio, title: 'Real-time dispatch', body: 'New orders go out to nearby riders the moment they are placed, so pickups start in minutes, not hours.' },
  { icon: ScrollText, title: 'Atomic trip logging', body: 'Every step of a trip is saved as one complete record. There are no half-written trips or missing entries, even if a connection drops.' },
  { icon: CopyCheck, title: 'Idempotent order creation', body: 'Tapping book twice or losing signal mid-checkout never creates a duplicate order or charges anyone twice.' },
  { icon: Navigation, title: 'Live rider location', body: 'Follow your rider on the map from pickup to drop-off and know exactly when your package will arrive.' },
  { icon: HandCoins, title: 'Automatic escrow release', body: 'Once delivery is confirmed, payment is released automatically. Riders and vendors get paid without chasing anyone.' },
  { icon: Handshake, title: 'Conflict-safe acceptance', body: 'When several riders go for the same order, exactly one gets it. No double assignments, no wasted trips.' },
  { icon: Route, title: 'Per-leg settlement', body: 'Trips with more than one leg are settled leg by leg, so everyone is paid for the part of the journey they completed.' },
  { icon: Scale, title: 'Dispute auto-escalation', body: 'Problems that are not resolved quickly are escalated automatically, so no complaint is left sitting unanswered.' },
  { icon: Split, title: 'Split disbursement', body: 'Payouts are split between vendor, rider and ASAP in a single step, straight to the right accounts.' },
  { icon: Webhook, title: 'Webhook delivery guarantee', body: 'Payment confirmations are retried until they land, so a dropped connection never loses a payment update.' },
]

export default function Features() {
  return (
    <section className="py-20">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-[#ff923e] font-medium tracking-wide uppercase">Features</p>
        <h2 className="mt-6 text-3xl sm:text-4xl font-bold text-white leading-tight text-balance">
          Some of what our API offers you
        </h2>
      </div>

      <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-14">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <Icon className="w-9 h-9 text-[#ff923e]" strokeWidth={1.5} />
            <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
            <p className="mt-3 text-[#a5abbd] leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
