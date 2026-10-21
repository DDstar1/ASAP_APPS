'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { POSTS, type Post } from '@/lib/blog'

// Feathers the black tile into the light card on all four sides
const EDGE = 'linear-gradient(to {d}, transparent, #000 4%, #000 96%, transparent)'
const FADE_EDGES: React.CSSProperties = {
  maskImage: `${EDGE.replace('{d}', 'right')}, ${EDGE.replace('{d}', 'bottom')}`,
  WebkitMaskImage: `${EDGE.replace('{d}', 'right')}, ${EDGE.replace('{d}', 'bottom')}`,
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in',
}

function Card({ post, active }: { post: Post; active: boolean }) {
  return (
    <div className="grid sm:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-6 sm:gap-10 items-center rounded-[2.5rem] bg-[#f1f1f1] p-1.5">
      <div className="relative aspect-[4/3] rounded-[2.25rem] bg-black overflow-hidden" style={FADE_EDGES}>
        <Image src={post.image} alt="" fill sizes="(min-width: 640px) 34rem, 90vw" className={post.imageClass} />
      </div>
      <div className="px-3 pb-6 sm:p-0 sm:pr-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ff7a00]">{post.brand}</p>
        <h3 className="mt-4 text-2xl sm:text-3xl font-semibold leading-tight text-black text-balance">{post.title}</h3>
        <p className="mt-3 text-black/60 leading-relaxed">{post.summary}</p>
        <Link href={`/blog/${post.slug}`} tabIndex={active ? 0 : -1}
          className="group mt-5 inline-flex items-center gap-2 font-semibold text-black underline underline-offset-4">
          Read More
          <span className="w-6 h-6 rounded-full bg-black/15 flex items-center justify-center group-hover:bg-[#ff7a00] group-hover:text-white transition-colors">
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
        <div className="mt-8 sm:mt-12 flex flex-wrap gap-x-8 gap-y-3">
          {post.tags.map((t) => (
            <span key={t} className="text-lg font-medium text-black">{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Ecosystem() {
  const [index, setIndex] = useState(0)
  const n = POSTS.length
  const go = (step: number) => setIndex((i) => (i + step + n) % n)

  return (
    <section className="mb-20 rounded-[2.5rem] bg-white text-black px-4 sm:px-8 py-16 sm:py-20 overflow-hidden">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a00]" /> The ASAP group
        </span>
        <h2 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight">What We&apos;ve Built</h2>
      </div>

      {/* Narrower than the panel so the side cards' peeks stay clear of its edges */}
      <div className="relative mt-14 mx-auto w-full lg:w-[82%] max-w-[64rem]">
        <div className="grid">
          {POSTS.map((post, i) => {
            // -1 left, 0 centre, 1 right
            const d = ((i - index + n + 1) % n) - 1
            return (
              <div key={post.slug} aria-hidden={d !== 0}
                className={`[grid-area:1/1] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  d === 0
                    ? 'z-10 opacity-100'
                    : `z-0 pointer-events-none opacity-0 lg:opacity-40 scale-[0.7] blur-[2px] ${d < 0 ? '-translate-x-[22%]' : 'translate-x-[22%]'}`
                }`}>
                <Card post={post} active={d === 0} />
              </div>
            )
          })}
        </div>

        <button type="button" onClick={() => go(-1)} aria-label="Previous"
          className="absolute z-20 left-0 sm:-left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:bg-[#ff7a00] transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next"
          className="absolute z-20 right-0 sm:-right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:bg-[#ff7a00] transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-10 flex justify-center gap-2">
        {POSTS.map((p, i) => (
          <button key={p.slug} type="button" onClick={() => setIndex(i)} aria-label={`Show ${p.brand}`}
            className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-linear-to-r from-[#ff923e] to-[#ff7a00]' : 'w-2 bg-black/15 hover:bg-black/30'}`} />
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link href="/blog" className="inline-block rounded-full bg-black px-7 py-3.5 font-semibold text-white hover:bg-[#ff7a00] transition-colors">
          Read the blog
        </Link>
      </div>
    </section>
  )
}
