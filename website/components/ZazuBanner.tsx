import Image from 'next/image'
import { Signal, BatteryFull } from 'lucide-react'
import { ZAZU_URL } from '@/lib/app-links'

export default function ZazuBanner() {
  return (
    <section className="mb-20 overflow-hidden rounded-[1.75rem] bg-[#2f7fef] grid lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="px-6 py-12 sm:px-10 lg:py-16 self-center">
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

      <div className="flex justify-center items-end px-6 lg:pl-0 lg:pr-16 pt-4 lg:pt-12">
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
