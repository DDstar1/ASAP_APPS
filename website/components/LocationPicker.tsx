'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'
import { MapPin, Loader2, Navigation, Search } from 'lucide-react'

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
  // The picked place's address, so the address and the pin always match
  onAddress?: (address: string) => void
}

const DEFAULT = { lat: 9.0579, lng: 7.4951 } // Abuja

// Same Places API (New) search the apps use; outside the component so the
// loader isn't re-created on every render
const libraries: 'places'[] = ['places']

type Suggestion = { id: string; main: string; secondary: string; prediction: google.maps.places.PlacePrediction }

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

export default function LocationPicker({ lat, lng, onChange, onAddress }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  })

  const [locating, setLocating] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  // One token per search, ended by the pick, so Google bills it as a session
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

  const center = lat !== null && lng !== null ? { lat, lng } : DEFAULT

  useEffect(() => {
    if (!isLoaded) return
    const input = query.trim()
    if (input.length < 3) { setSuggestions([]); return }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        sessionToken.current ??= new google.maps.places.AutocompleteSessionToken()
        const { suggestions: results } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionToken.current,
          includedRegionCodes: ['ng'],
          locationBias: center,
        })
        setSuggestions(
          results.flatMap(({ placePrediction: p }) =>
            p ? [{ id: p.placeId, main: p.mainText?.text ?? p.text.text, secondary: p.secondaryText?.text ?? '', prediction: p }] : [],
          ),
        )
      } catch {
        setSuggestions([])
      }
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
    // center only biases results; re-searching when the pin moves isn't wanted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isLoaded])

  async function pickSuggestion(s: Suggestion) {
    setSuggestions([])
    setQuery(s.main)
    const place = s.prediction.toPlace()
    await place.fetchFields({ fields: ['location', 'formattedAddress'] })
    sessionToken.current = null
    if (!place.location) return
    onChange(place.location.lat(), place.location.lng())
    onAddress?.(place.formattedAddress ?? [s.main, s.secondary].filter(Boolean).join(', '))
  }

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
      { timeout: 8000, enableHighAccuracy: true },
    )
  }

  return (
    <div className="space-y-2">
      {isLoaded && (
        <div className="relative">
          <Search className="w-4 h-4 text-[#a5abbd] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for your store's address"
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#a5abbd]/15 bg-[#152035] text-[#e0e5f9] placeholder:text-[#a5abbd]/50 focus:outline-none focus:border-[#ff923e]/40 focus:ring-1 focus:ring-[#ff923e]/40 transition text-sm"
          />
          {searching && <Loader2 className="w-4 h-4 animate-spin text-[#a5abbd] absolute right-3.5 top-1/2 -translate-y-1/2" />}
          {suggestions.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 mt-1 bg-[#1c2a42] border border-[#a5abbd]/15 rounded-xl overflow-hidden shadow-[0_12px_32px_rgba(8,14,28,0.5)]">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#253350] transition flex items-start gap-2"
                  >
                    <MapPin className="w-4 h-4 text-[#ff923e] shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-sm text-[#e0e5f9] truncate">{s.main}</span>
                      {s.secondary && <span className="block text-xs text-[#a5abbd] truncate">{s.secondary}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
          <span className="text-xs text-[#a5abbd]/60">Search, click the map or drag the pin</span>
        )}
      </div>
    </div>
  )
}
