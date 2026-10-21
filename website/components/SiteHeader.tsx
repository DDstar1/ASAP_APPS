import Link from 'next/link'
import { Package } from 'lucide-react'

export default function SiteHeader({ className = '' }: { className?: string }) {
  return (
    <header className={`z-20 flex items-center justify-between gap-4 px-4 sm:px-6 py-5 ${className}`}>
      <Link href="/" className="flex items-center gap-2" aria-label="ASAP home">
        <div className="bg-linear-to-br from-[#ff923e] to-[#c46018] p-2 rounded-xl">
          <Package className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold bg-linear-to-r from-[#ff923e] to-[#c46018] bg-clip-text text-transparent">
          ASAP.
        </span>
      </Link>
      <div className="flex items-center gap-1 sm:gap-4">
        <Link href="/blog" className="px-3 sm:px-5 py-2 text-white/75 hover:text-white font-medium transition-colors">
          Blog
        </Link>
        <Link href="/login" className="px-3 sm:px-5 py-2 text-white/75 hover:text-white font-medium transition-colors">
          Sign In
        </Link>
        <Link href="/signup"
          className="px-5 sm:px-6 py-2 bg-linear-to-r from-[#ff923e] to-[#c46018] text-white rounded-full font-medium hover:shadow-[0_0_20px_rgba(255,146,62,0.3)] hover:scale-105 transition-all">
          Get Started
        </Link>
      </div>
    </header>
  )
}
