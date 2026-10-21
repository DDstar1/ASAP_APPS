import Image from 'next/image'
import { Signal, BatteryFull } from 'lucide-react'
import { ZAZU_URL } from '@/lib/app-links'

// Outline doodles: a perched bird and a bird in flight, drawn with round strokes so they read as sketches
function PerchedBird({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 30c0-7 5-12 12-12 2.5 0 4.5.8 6 2.2" />
      <path d="M30 20.2c1.6-3.4 5-5.4 8.4-4.6l2.6.7-2.8 1.6c.6 1.8.5 3.8-.4 5.6-1.5 3-3.5 5.5-6.6 7.4-3.6 2.2-8.2 2.9-12.4 1.6L6 36l5.6-5.4" />
      <path d="M17 26.5c2.6 2.4 6.6 2.8 9.6 1" />
      <circle cx="35.5" cy="18.6" r=".6" fill="currentColor" />
      <path d="M22 33.6v6M26.5 32.8v6.4M20 39.6h4.4M24.6 39.2h4.2" />
    </svg>
  )
}

function FlyingBird({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 13c5-6 10.5-7 16-2.5L24 15l5-4.5C34.5 6 40 7 45 13" />
      <path d="M22 15.5c.6 1.6 2.4 1.6 4 0" />
    </svg>
  )
}

const DOODLES = [
  { kind: 'perched', className: 'left-[3%] top-[8%] w-14 -rotate-6' },
  { kind: 'flying', className: 'left-[30%] top-[6%] w-16 rotate-3' },
  { kind: 'flying', className: 'left-[42%] top-[16%] w-9 -rotate-6' },
  { kind: 'perched', className: 'left-[48%] bottom-[10%] w-16 rotate-6' },
  { kind: 'flying', className: 'left-[8%] bottom-[8%] w-12 rotate-[8deg]' },
  { kind: 'flying', className: 'right-[6%] top-[10%] w-14 -rotate-3' },
  { kind: 'perched', className: 'right-[3%] bottom-[28%] w-12 -rotate-12 hidden lg:block' },
  { kind: 'flying', className: 'left-[62%] top-[40%] w-10 rotate-12 hidden lg:block' },
] as const

export default function ZazuBanner() {
  return (
    <section className="relative mb-20 overflow-hidden rounded-[1.75rem] bg-[#2f7fef] grid lg:grid-cols-[minmax(0,1fr)_auto]">
      <div aria-hidden className="pointer-events-none absolute inset-0 text-white/30">
        {DOODLES.map((d, i) => d.kind === 'perched'
          ? <PerchedBird key={i} className={`absolute ${d.className}`} />
          : <FlyingBird key={i} className={`absolute ${d.className}`} />)}
      </div>

      <div className="relative px-6 py-12 sm:px-10 lg:py-16 self-center">
        <h2 className="text-3xl sm:text-5xl font-bold leading-[1.15] tracking-tight text-white text-balance">
          It&apos;s probably <span className="text-black">already on your phone</span>, just order
        </h2>
        <p className="mt-5 text-lg sm:text-xl text-white/85 max-w-xl">
          Search for your favourite stores and place your orders instantly
        </p>
        <a href={ZAZU_URL} target={ZAZU_URL && '_blank'} rel="noopener noreferrer"
          className="mt-8 inline-block px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors cursor-pointer">
          Zazu
        </a>
      </div>

      <div className="relative flex justify-center items-end px-6 lg:pl-0 lg:pr-16 pt-4 lg:pt-12">
        <div className="relative w-[17rem] sm:w-[20rem] h-[19rem] sm:h-[23rem] rounded-t-[3rem] bg-black p-3 pb-0">
          <span aria-hidden className="absolute -left-1 top-24 h-10 w-1 rounded-l bg-black" />
          <span aria-hidden className="absolute -left-1 top-40 h-16 w-1 rounded-l bg-black" />
          <span aria-hidden className="absolute -left-1 top-60 h-16 w-1 rounded-l bg-black" />
          <div className="h-full rounded-t-[2.4rem] bg-[#4492f4] flex flex-col">
            <div className="flex items-center justify-between px-7 pt-5 text-white text-sm font-semibold">
              <span>12:22</span>
              <span className="flex items-center gap-1.5">
                <Signal className="w-4 h-4" />
                <BatteryFull className="w-5 h-5" />
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center pb-6">
              <Image src="/zazu/logo.jpg" alt="Zazu" width={157} height={170} className="w-40 sm:w-48 h-auto rounded-[1.75rem] border-4 border-black" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
