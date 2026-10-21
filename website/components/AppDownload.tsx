import Image from 'next/image'
import { CUSTOMER_APP_STORE_URL, CUSTOMER_PLAY_STORE_URL } from '@/lib/app-links'

// Widths are shares of the phone row (30 + 38 + 30, less the overlap, stays under 100%),
// so the three always fit the column; fixed rem widths overflowed it and Safari clipped the right phone
const PHONES = [
  { src: '/apps/orders.png', alt: 'ASAP app: your orders', className: 'w-[30%] max-w-[6rem] translate-y-[14%]' },
  { src: '/apps/loading.png', alt: 'ASAP app loading screen', className: 'z-10 -mx-[2%] w-[38%] max-w-[7.5rem] translate-y-[6%]' },
  { src: '/apps/booking.png', alt: 'ASAP app: booking a delivery', className: 'w-[30%] max-w-[6rem] translate-y-[14%]' },
]

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden>
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.32-3.5zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.22z" />
    </svg>
  )
}

function PlayLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
      <path d="M3.6 2.3 13.4 12l-9.8 9.7c-.35-.2-.6-.6-.6-1.1V3.4c0-.5.25-.9.6-1.1z" fill="#00d7fe" />
      <path d="m16.8 8.6-3.4 3.4-9.8-9.7c.3-.2.75-.2 1.2.05z" fill="#32bb6a" />
      <path d="m16.8 15.4-12 6.25c-.45.25-.9.25-1.2.05l9.8-9.7z" fill="#f43249" />
      <path d="m20.4 10.5c.8.45.8 1.6 0 2.05l-3.6 1.85-3.4-3.4 3.4-3.4z" fill="#ffd400" />
    </svg>
  )
}

function StoreBadge({ href, logo, kicker, store }: { href?: string; logo: React.ReactNode; kicker: string; store: string }) {
  return (
    <a href={href} target={href && '_blank'} rel="noopener noreferrer"
      className="inline-flex items-center gap-3 pl-4 pr-6 py-2.5 rounded-2xl bg-black border border-white/25 text-white hover:border-[#ff923e] hover:bg-white/5 transition-colors cursor-pointer">
      {logo}
      <span className="text-left leading-tight">
        <span className="block text-[11px] text-white/70">{kicker}</span>
        <span className="block text-lg font-semibold">{store}</span>
      </span>
    </a>
  )
}

export default function AppDownload() {
  return (
    <section className="overflow-hidden grid lg:grid-cols-[minmax(0,1fr)_30%] lg:h-[21rem] rounded-[2.5rem] border border-[#f3efe7]">
      <div className="px-6 py-10 sm:p-12 lg:pr-10 flex flex-col justify-center items-center lg:items-start">
        <h2 className="app-cycle-text whitespace-nowrap text-[clamp(1.75rem,7.5vw,3.75rem)] lg:text-5xl xl:text-7xl font-bold leading-[1.05] tracking-tight">
          <span className="text-white">Buy back</span>{' '}
          <span className="text-[#ff923e]">your time</span>
        </h2>
        <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
          <StoreBadge href={CUSTOMER_APP_STORE_URL} logo={<AppleLogo />} kicker="Download on the" store="App Store" />
          <StoreBadge href={CUSTOMER_PLAY_STORE_URL} logo={<PlayLogo />} kicker="Get it on" store="Google Play" />
        </div>
      </div>

      <div className="relative overflow-hidden ml-auto w-[75%] h-[17rem] lg:ml-0 lg:w-full lg:h-full">
        <div className="app-disc absolute left-8 lg:left-12 top-1/2 -translate-y-1/2 size-[30rem] lg:size-[38rem] rounded-full bg-linear-to-br from-[#ff923e] to-[#c46018]" />
        <div className="relative h-full pl-[22%] pr-[3%] flex items-end justify-center">
          {PHONES.map((p) => (
            <div key={p.src} className={`relative ${p.className}`}>
              <Image src={p.src} alt={p.alt} width={640} height={1302} sizes="7rem"
                className="app-cycle-phone w-full h-auto drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
