'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Camera, Home, Store, KeyRound, LogOut, Moon, Sun, Loader2 } from 'lucide-react'
import { updateProfileImage } from '@/lib/supabase_queries'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

type Props = {
  userId: string
  name: string
  photo: string | null
  onPhoto: (url: string) => void
  isVendor: boolean
  dark: boolean
  onToggleTheme: () => void
  onChangePassword: () => void
  onSignOut: () => void
}

// Top-right avatar. Its menu holds everything that isn't a page of the panel.
export default function AvatarMenu(props: Props) {
  const { userId, name, photo, onPhoto, isVendor, dark, onToggleTheme, onChangePassword, onSignOut } = props
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Choose an image file.'); return }
    if (file.size > MAX_PHOTO_BYTES) { setError('The photo must be under 5 MB.'); return }
    setError('')
    setUploading(true)
    try {
      onPhoto(await updateProfileImage(userId, file))
    } catch {
      setError('Could not upload the photo. Try again.')
    } finally {
      setUploading(false)
    }
  }

  const item = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-inv-text hover:bg-inv-soft transition cursor-pointer'

  return (
    <div ref={root} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        className="block w-10 h-10 rounded-full overflow-hidden ring-2 ring-inv-line hover:ring-inv-accent transition cursor-pointer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo ?? '/invest/helmet_avatar.png'} alt="" className="w-full h-full object-cover bg-inv-soft" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 bg-inv-surface border border-inv-line rounded-2xl p-2 shadow-[0_16px_40px_rgba(13,21,37,0.16)] z-50">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-inv-soft shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo ?? '/invest/helmet_avatar.png'} alt="" className="w-full h-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-inv-text truncate">{name}</p>
              <p className="text-xs text-inv-muted">Asset owner</p>
            </div>
          </div>
          {error && <p role="alert" className="px-3 pb-2 text-xs text-red-600">{error}</p>}

          <div className="border-t border-inv-line my-1" />
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button role="menuitem" className={item} disabled={uploading} onClick={() => fileInput.current?.click()}>
            <Camera className="w-4 h-4 text-inv-muted" /> {photo ? 'Change photo' : 'Add a photo'}
          </button>
          <button role="menuitem" className={item} onClick={onToggleTheme}>
            {dark ? <Sun className="w-4 h-4 text-inv-muted" /> : <Moon className="w-4 h-4 text-inv-muted" />}
            {dark ? 'Light mode' : 'Dark mode'}
          </button>

          <div className="border-t border-inv-line my-1" />
          <Link role="menuitem" href="/home" className={item}>
            <Home className="w-4 h-4 text-inv-muted" /> Go to Home
          </Link>
          {isVendor && (
            <Link role="menuitem" href="/vendor/dashboard" className={item}>
              <Store className="w-4 h-4 text-inv-muted" /> Switch to Vendor Dashboard
            </Link>
          )}
          <button role="menuitem" className={item} onClick={() => { setOpen(false); onChangePassword() }}>
            <KeyRound className="w-4 h-4 text-inv-muted" /> Change Password
          </button>
          <button role="menuitem" onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-500/10 transition cursor-pointer">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
