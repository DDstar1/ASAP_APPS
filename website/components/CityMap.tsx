import { Bike } from 'lucide-react'

// A still, near-black map of Abuja with illustrative bikes, filling its parent
// (position it relative). The map is a Google Static Maps image (the key needs the
// Static Maps API); the pins are HTML placed with the same Web Mercator maths.
// Map and pins share one square box scaled to cover the parent, so the pins stay
// on their streets at any screen shape.

const CENTER = { lat: 9.0655, lng: 7.4690 }
const ZOOM = 12
const SIZE = 640

// Illustrative only: no real rider positions
const BIKES = [
  { lat: 9.0790, lng: 7.4800, area: 'Wuse 2' },
  { lat: 9.0365, lng: 7.4880, area: 'Garki' },
  { lat: 9.0890, lng: 7.4945, area: 'Maitama' },
  { lat: 9.0450, lng: 7.5260, area: 'Asokoro' },
  { lat: 9.0680, lng: 7.4400, area: 'Utako' },
  { lat: 9.0705, lng: 7.4230, area: 'Jabi' },
  { lat: 9.0560, lng: 7.4905, area: 'Central Area' },
  { lat: 9.1050, lng: 7.4120, area: 'Gwarinpa' },
  { lat: 9.0230, lng: 7.4560, area: 'Durumi' },
  { lat: 9.0960, lng: 7.4500, area: 'Mabushi' },
  { lat: 9.0120, lng: 7.4950, area: 'Apo' },
  { lat: 9.1230, lng: 7.4700, area: 'Kado' },
]

const STYLES = [
  'element:geometry|color:0x0a0a0a',
  'element:labels.icon|visibility:off',
  'element:labels.text.fill|color:0x5c5c5c',
  'element:labels.text.stroke|color:0x0a0a0a',
  'feature:administrative|element:geometry|visibility:off',
  'feature:poi|visibility:off',
  'feature:transit|visibility:off',
  'feature:road|element:geometry|color:0x1c1c1c',
  'feature:road.arterial|element:geometry|color:0x242424',
  'feature:road.highway|element:geometry|color:0x2c2c2c',
  'feature:road|element:labels.text.fill|color:0x4a4a4a',
  'feature:water|element:geometry|color:0x050505',
  'feature:landscape.natural|element:geometry|color:0x0d0d0d',
]

// lat/lng -> pixels on the whole world at this zoom (Web Mercator, 256px tiles)
function project(lat: number, lng: number) {
  const size = 256 * 2 ** ZOOM
  const sin = Math.sin((lat * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  }
}

function staticMapUrl(key: string) {
  const params = new URLSearchParams({
    center: `${CENTER.lat},${CENTER.lng}`,
    zoom: String(ZOOM),
    size: `${SIZE}x${SIZE}`,
    scale: '2',
    key,
  })
  return `https://maps.googleapis.com/maps/api/staticmap?${params}&${STYLES.map((s) => `style=${encodeURIComponent(s)}`).join('&')}`
}

export default function CityMap({ className = '' }: { className?: string }) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const center = project(CENTER.lat, CENTER.lng)

  return (
    <div className={`absolute inset-0 overflow-hidden bg-[#0a0a0a] select-none pointer-events-none ${className}`} aria-hidden>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square w-[max(100%,100dvh)]">
        {key && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={staticMapUrl(key)} alt="" draggable={false} fetchPriority="high"
            className="absolute inset-0 w-full h-full" />
        )}
        {BIKES.map(({ lat, lng, area }, i) => {
          const p = project(lat, lng)
          const left = 50 + ((p.x - center.x) / SIZE) * 100
          const top = 50 + ((p.y - center.y) / SIZE) * 100
          if (left < 2 || left > 98 || top < 2 || top > 98) return null
          return (
            <span key={area} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%`, top: `${top}%` }}>
              <span className="absolute inset-0 rounded-full bg-[#ff6a1a] animate-ping opacity-40 motion-reduce:hidden"
                style={{ animationDuration: `${2.2 + (i % 4) * 0.4}s`, animationDelay: `${(i * 0.37) % 2}s` }} />
              <span className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#ff6a1a] ring-2 ring-black shadow-[0_0_20px_rgba(255,106,26,0.55)]">
                <Bike className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
