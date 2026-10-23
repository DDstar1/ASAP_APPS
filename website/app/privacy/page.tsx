import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy | ASAP',
  description: 'How the ASAP customer and rider apps collect and use your information.',
}

const POLICIES = [
  { href: '/privacy/customer', title: 'ASAP Customer app', body: 'For people sending packages.' },
  { href: '/privacy/rider', title: 'ASAP Rider app', body: 'For riders delivering with ASAP.' },
]

export default function PrivacyIndex() {
  return (
    <div className="max-w-3xl mx-auto">
      <p className="text-[#ff7a00] font-medium uppercase tracking-wide text-sm">Privacy</p>
      <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-white">Privacy policies</h1>
      <p className="mt-5 text-lg text-[#a5abbd]">Each ASAP app has its own policy, because riders and customers share different information.</p>
      <div className="mt-10 grid sm:grid-cols-2 gap-4">
        {POLICIES.map((p) => (
          <Link key={p.href} href={p.href}
            className="group rounded-3xl border border-white/10 bg-[#0e0e0e] p-6 hover:border-[#ff7a00]/60 transition-colors">
            <p className="text-xl font-semibold text-white">{p.title}</p>
            <p className="mt-1 text-[#a5abbd]">{p.body}</p>
            <span className="mt-5 inline-flex items-center gap-2 font-semibold text-[#ff923e]">
              Read the policy <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
