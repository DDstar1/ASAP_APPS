import Image from 'next/image'
import {
  UserCheck, ShieldCheck, BatteryCharging, Ruler, Timer, TrendingDown, Layers, ChartLine,
  type LucideIcon,
} from 'lucide-react'

type Item = { icon: LucideIcon; title: string; body: string; graphic?: string }

// Drop each graphic into public/platform/ and set `graphic` to its path
const ITEMS: Item[] = [
  { icon: UserCheck, title: 'Vendor-owned customers', body: 'Your customers stay yours. Their order history belongs to your store, not to a marketplace that sells them back to you.' },
  { icon: ShieldCheck, title: 'Escrow-protected delivery', body: 'Payment is held in escrow until the order is delivered, so you and your customers are covered on every trip.' },
  { icon: BatteryCharging, title: 'EV-first fleet', body: 'Our riders use electric bikes first, keeping deliveries quiet, clean and cheaper to run.' },
  { icon: Ruler, title: 'Per-km transparent pricing', body: 'Delivery is priced by the kilometre and shown up front. No surprise surcharges, no hidden fees.' },
  { icon: Timer, title: '2 Minute Shopping', body: 'Customers find your store, pick what they want and check out in about two minutes.' },
  { icon: TrendingDown, title: 'Order Down intelligence', body: 'Spot when orders start to slow and see why, so you can act before a quiet day becomes a quiet week.' },
  { icon: Layers, title: 'Tiered vendor subscriptions', body: 'Pick the plan that fits your store today and move up as you grow.' },
  { icon: ChartLine, title: 'Live earnings dashboard', body: 'Watch sales, payouts and fees update in real time from your vendor dashboard.' },
]

function Graphic({ src, alt }: { src?: string; alt: string }) {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div aria-hidden className="absolute inset-x-[10%] -inset-y-[12%] bg-[#e8622a] [clip-path:polygon(0_0,100%_14%,100%_100%,0_86%)]" />
      <div className="relative aspect-[4/3] rounded-2xl border border-white/10 bg-[#141414] overflow-hidden">
        {src && <Image src={src} alt={alt} fill sizes="24rem" className="object-cover" />}
      </div>
    </div>
  )
}

export default function Platform() {
  return (
    <section className="py-20 mb-10">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-[#ff923e] font-medium tracking-wide uppercase">Our platform</p>
        <h2 className="mt-6 text-3xl sm:text-4xl font-bold text-white leading-tight text-balance">
          Delivery built around your store, from your first order to your thousandth
        </h2>
      </div>

      <div className="mt-20 grid lg:grid-cols-2 gap-x-16 gap-y-24">
        {ITEMS.map(({ icon: Icon, title, body, graphic }) => (
          <div key={title} className="grid sm:grid-cols-2 items-center gap-10">
            <div>
              <Icon className="w-9 h-9 text-[#ff923e]" strokeWidth={1.5} />
              <h3 className="mt-5 text-2xl font-semibold text-white">{title}</h3>
              <p className="mt-3 text-lg text-[#a5abbd] leading-relaxed">{body}</p>
            </div>
            <Graphic src={graphic} alt={title} />
          </div>
        ))}
      </div>
    </section>
  )
}
