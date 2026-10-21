import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { POSTS, getPost } from '@/lib/blog'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug)
  return post ? { title: `${post.brand} | ASAP Blog`, description: post.summary } : {}
}

export default async function BlogPost({ params }: Props) {
  const post = getPost((await params).slug)
  if (!post) notFound()

  return (
    <article className="max-w-3xl mx-auto">
      <Link href="/blog" className="inline-flex items-center gap-2 text-[#a5abbd] hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> All posts
      </Link>

      <p className="mt-10 text-sm font-bold uppercase tracking-[0.18em] text-[#ff7a00]">{post.brand}</p>
      <h1 className="mt-4 text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-white text-balance">{post.title}</h1>
      <p className="mt-5 text-xl text-[#a5abbd] leading-relaxed">{post.summary}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {post.tags.map((t) => (
          <span key={t} className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/80">{t}</span>
        ))}
      </div>

      <div className="relative mt-10 aspect-[16/9] rounded-[2rem] bg-black border border-white/10 overflow-hidden">
        <Image src={post.image} alt="" fill priority sizes="(min-width: 768px) 48rem, 100vw" className={post.imageClass} />
      </div>

      {post.body.length ? (
        <div className="mt-12 space-y-6 text-lg leading-relaxed text-[#d4d8e6]">
          {post.body.map((para, i) => <p key={i}>{para}</p>)}
        </div>
      ) : (
        <div className="mt-12 rounded-2xl border border-white/10 bg-[#0e0e0e] p-8 text-center">
          <p className="text-xl font-semibold text-white">The full write-up is coming soon</p>
          <p className="mt-2 text-[#a5abbd]">We&apos;re putting together a detailed look at how {post.brand} works.</p>
        </div>
      )}
    </article>
  )
}
