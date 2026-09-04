import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

// A simple SVG pin as a divIcon, rather than Leaflet's default marker image --
// the default PNG icon's relative asset paths don't resolve correctly under
// Vite's bundler without extra config, so this sidesteps that entirely.
const PIN_ICON = L.divIcon({
  className: '',
  html: `<div style="font-size:28px;line-height:28px;transform:translate(-50%,-90%)">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [0, 0],
})

// Centered roughly over Peninsular Malaysia/Singapore -- the bulk of the
// curated dataset -- when no location has been picked yet.
const DEFAULT_CENTER: [number, number] = [3.5, 103.5]
const DEFAULT_ZOOM = 6
const PICKED_ZOOM = 16

export function LocationMap({
  value, onPick,
}: { value: { lat: number; lng: number } | null; onPick: (lat: number, lng: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: value ? [value.lat, value.lng] : DEFAULT_CENTER,
      zoom: value ? PICKED_ZOOM : DEFAULT_ZOOM,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      onPickRef.current(e.latlng.lat, e.latlng.lng)
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  // Reflect the controlled `value` prop -- whether set by a map click just
  // above, or by picking a text-autocomplete suggestion -- onto the marker.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !value) return

    if (!markerRef.current) {
      const marker = L.marker([value.lat, value.lng], { icon: PIN_ICON, draggable: true })
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        onPickRef.current(pos.lat, pos.lng)
      })
      marker.addTo(map)
      markerRef.current = marker
      map.setView([value.lat, value.lng], PICKED_ZOOM)
    } else {
      markerRef.current.setLatLng([value.lat, value.lng])
      map.panTo([value.lat, value.lng])
    }
  }, [value])

  return (
    <div>
      <div ref={containerRef} className="h-64 w-full rounded-md border border-neutral-300" />
      <p className="mt-1 text-xs text-neutral-400">
        Click the map (or drag the pin) to set the exact location -- it fills in Address / Country / State / Area too.
      </p>
    </div>
  )
}
