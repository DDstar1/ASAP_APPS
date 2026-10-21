import Image from 'next/image'
import Link from 'next/link'

// Exactly the background colour of /auth/rider-card.png, so the art has no visible edge
const ART_BG = 'bg-[#1f2124]'

export const authInput =
  'w-full px-4 py-3 rounded-xl border border-white/10 bg-[#161616] text-[#e0e5f9] placeholder:text-[#a5abbd]/50 focus:outline-none focus:border-[#ff923e]/50 focus:ring-1 focus:ring-[#ff923e]/50 transition'

export const authLabel = 'block text-sm font-medium text-[#e0e5f9] mb-1.5'

export const authSubmit =
  'w-full py-3.5 px-6 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-semibold hover:shadow-[0_12px_32px_rgba(255,146,62,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer'

function Logo() {
  return (
    <Link href="/" className="text-2xl font-bold text-white" aria-label="ASAP home">ASAP.</Link>
  )
}

// Split auth card: rider art on the left, the form on a panel whose curved
// left edge overlaps it. `pitch` adds a headline over the art (signup only).
export default function AuthShell({ title, subtitle, pitch, children }: {
  title: string
  subtitle: string
  pitch?: { headline: string; body: string }
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-black flex items-center justify-center p-3 sm:p-8">
      <div className={`w-full ${pitch ? 'max-w-5xl' : 'max-w-4xl'} rounded-[2.25rem] border border-white/10 ${ART_BG} overflow-hidden flex`}>
        <div className={`hidden lg:flex flex-col ${pitch ? 'w-[46%]' : 'w-[42%]'} shrink-0 px-10 pt-10 pb-6 text-white`}>
          {pitch && (
            <div>
              <h2 className="text-4xl font-bold leading-tight tracking-tight">{pitch.headline}</h2>
              <p className="mt-3 text-white/60 leading-relaxed max-w-xs">{pitch.body}</p>
            </div>
          )}
          <div className="relative flex-1 min-h-[18rem] mt-6 mr-10">
            {/* Unoptimized: re-encoding shifts the background colour and shows the image's edge */}
            <Image src="/auth/rider-card.png" alt="" fill priority unoptimized className="object-contain object-bottom" />
          </div>
        </div>

        {/* Runs to the card's top, right and bottom edges; only its left side curves over the art */}
        <div className="relative z-10 flex-1 min-w-0 lg:rounded-l-[5rem] lg:-ml-10 bg-[#0b0b0c] px-6 py-10 sm:px-12 lg:pl-20 lg:pr-14 sm:py-14 flex flex-col justify-center">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-[#a5abbd]">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
