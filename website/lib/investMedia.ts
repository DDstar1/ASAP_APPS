import type { AssetType } from '@/lib/invest'

// What each plan looks like. On the plan cards a video loop plays when there is
// one (MP4/WebM, ideally a turntable of the vehicle), otherwise the stills
// rotate. Owned assets use the first still.
//
// The current files are placeholders; swap in ASAP's own photos/renders under
// public/invest/<type>/ and update the lists here.
export type AssetMedia = {
  video?: { mp4?: string; webm?: string }
  stills: { src: string; alt: string }[]
}

export const ASSET_MEDIA: Record<AssetType, AssetMedia> = {
  ev: {
    stills: [
      { src: '/invest/ev/ev-red.jpg', alt: 'Electric motorbike, red, side view' },
      { src: '/invest/ev/ev-yellow.jpg', alt: 'Electric motorbike, yellow, side view' },
      { src: '/invest/ev/ev-blue.jpg', alt: 'Electric motorbike, blue, side view' },
      { src: '/invest/ev/ev-black.jpg', alt: 'Electric motorbike, black, side view' },
      { src: '/invest/ev/ev-navy.jpg', alt: 'Electric motorbike, navy, side view' },
    ],
  },
  bicycle: {
    stills: [
      { src: '/invest/bicycle/bicycle-front.jpg', alt: 'Delivery bicycle, front three-quarter view' },
      { src: '/invest/bicycle/bicycle-side.jpg', alt: 'Delivery bicycle, side view' },
    ],
  },
}

export const ASSET_TYPE_LABEL: Record<AssetType, string> = { ev: 'Electric bike', bicycle: 'Bicycle' }
