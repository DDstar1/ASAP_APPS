import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { POSTS } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog | ASAP',
  description: 'How Zazu, ASAP and ASAP Fleet Holdings work.',
}

export default function BlogIndex() {
  return (
    <>
      <header className="max-w-3xl">
        <p className="text-[#ff7a00] font-medium uppercase tracking-wide">Blog</p>
        <h1 className="mt-4 text-4xl sm:text-6xl font-bold tracking-tight text-white">How the ASAP group works</h1>
        <p className="mt-5 text-lg sm:text-xl text-[#a5abbd]">
          What each part of ASAP does, in plain terms.
        </p>
      </header>

      <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {POSTS.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`}
            className="group rounded-[2rem] border border-white/10 bg-[#0e0e0e] p-3 hover:border-[#ff7a00]/60 transition-colors">
            <div className="relative aspect-[4/3] rounded-[1.5rem] bg-black overflow-hidden">
              <Image src={p.image} alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 90vw" className={p.imageClass} />
            </div>
            <div className="p-4">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ff7a00]">{p.brand}</p>
              <h2 className="mt-3 text-2xl font-semibold leading-snug text-white">{p.title}</h2>
              <p className="mt-3 text-[#a5abbd] leading-relaxed">{p.summary}</p>
              <span className="mt-5 inline-flex items-center gap-2 font-semibold text-white">
                {p.body.length ? 'Read' : 'Coming soon'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
