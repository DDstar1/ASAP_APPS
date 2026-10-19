'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Pause, Play } from 'lucide-react'
import { ASSET_MEDIA } from '@/lib/investMedia'
import type { AssetType } from '@/lib/invest'

const ROTATE_MS = 3500

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}

// Plan showcase: the video loop if the asset type has one, otherwise its stills
// crossfading. Rotation pauses on hover/focus, on the pause button, and never
// starts for reduced-motion users.
export function AssetShowcase({ type, className = '' }: { type: AssetType; className?: string }) {
  const media = ASSET_MEDIA[type]
  const reducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovering, setHovering] = useState(false)
  const stills = media.stills
  const rotating = !media.video && stills.length > 1 && !paused && !hovering && !reducedMotion

  useEffect(() => {
    if (!rotating) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % stills.length), ROTATE_MS)
    return () => clearInterval(timer)
  }, [rotating, stills.length])

  if (media.video && !reducedMotion) {
    return (
      <div className={`relative overflow-hidden bg-inv-soft ${className}`}>
        <video autoPlay muted loop playsInline poster={stills[0]?.src} aria-label={stills[0]?.alt}
          className="absolute inset-0 w-full h-full object-cover">
          {media.video.webm && <source src={media.video.webm} type="video/webm" />}
          {media.video.mp4 && <source src={media.video.mp4} type="video/mp4" />}
        </video>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-inv-soft ${className}`}
      onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)} onBlur={() => setHovering(false)}>
      {stills.map((still, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={still.src} src={still.src} alt={i === index ? still.alt : ''} aria-hidden={i !== index}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`} />
      ))}

      {stills.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/45 backdrop-blur rounded-full px-2 py-1">
          {stills.map((still, i) => (
            <button key={still.src} onClick={() => setIndex(i)} aria-label={`Show ${still.alt}`} aria-pressed={i === index}
              className="w-6 h-6 flex items-center justify-center cursor-pointer">
              <span className={`block h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-[#ff923e]' : 'w-1.5 bg-[#a5abbd]/60'}`} />
            </button>
          ))}
          {!reducedMotion && (
            <button onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
              className="w-6 h-6 flex items-center justify-center text-[#e0e5f9] cursor-pointer">
              {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// One fixed picture for an owned asset
export function AssetStill({ type, className = '' }: { type: AssetType; className?: string }) {
  const still = ASSET_MEDIA[type].stills[0]
  return (
    <div className={`relative overflow-hidden bg-inv-soft ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={still.src} alt={still.alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
    </div>
  )
}
