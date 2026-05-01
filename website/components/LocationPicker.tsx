'use client'

import { useCallback, useState } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { MapPin, Loader2, Navigation } from 'lucide-react'

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}

const DEFAULT = { lat: 6.5244, lng: 3.3792 } // Lagos

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0d1525' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a5abbd' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1525' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c2a42' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#152035' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#080e1c' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

export default function LocationPicker({ lat, lng, onChange }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  })

  const [locating, setLocating] = useState(false)

  const center = lat !== null && lng !== null ? { lat, lng } : DEFAULT

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      onChange(e.latLng.lat(), e.latLng.lng())
    },
    [onChange],
  )

  const handleMarkerDrag = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      onChange(e.latLng.lat(), e.latLng.lng())
    },
    [onChange],
  )

  function useMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange(coords.latitude, coords.longitude)
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 },
    )
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden border border-[#a5abbd]/15" style={{ height: 260 }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={14}
            options={{
              styles: mapStyles,
              disableDefaultUI: true,
              zoomControl: true,
              clickableIcons: false,
            }}
            onClick={handleMapClick}
          >
            {lat !== null && lng !== null && (
              <Marker
                position={{ lat, lng }}
                draggable
                onDragEnd={handleMarkerDrag}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#152035]">
            <Loader2 className="w-6 h-6 animate-spin text-[#ff923e]" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-[#a5abbd]/15 bg-[#152035] text-[#a5abbd] hover:text-[#e0e5f9] hover:border-[#ff923e]/40 transition disabled:opacity-60"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          Use my location
        </button>

        {lat !== null && lng !== null ? (
          <span className="flex items-center gap-1.5 text-xs text-[#a5abbd]">
            <MapPin className="w-3.5 h-3.5 text-[#ff923e]" />
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        ) : (
          <span className="text-xs text-[#a5abbd]/60">Click the map to set location</span>
        )}
      </div>
    </div>
  )
}
