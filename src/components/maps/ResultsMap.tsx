import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Lodging, Place } from '../../types/geo'
import { formatDistance } from '../../utils/geo'

interface Props {
  origin: Place
  radiusMeters: number
  lodgings: Lodging[]
  selectedId?: string
  onSelect: (id: string) => void
}

/** Mapa Leaflet con teselas de OpenStreetMap. Marcadores vectoriales (sin imágenes externas). */
export default function ResultsMap({ origin, radiusMeters, lodgings, selectedId, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const markers = useRef(new Map<string, L.CircleMarker>())

  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { zoomControl: true, scrollWheelZoom: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    const markerMap = markers.current
    return () => {
      m.remove()
      map.current = null
      markerMap.clear()
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    markers.current.clear()
    const center: L.LatLngExpression = [origin.latitude, origin.longitude]
    L.circle(center, { radius: radiusMeters, color: '#0f766e', weight: 2, fillOpacity: 0.06 }).addTo(g)
    L.circleMarker(center, { radius: 9, color: '#7c2d12', fillColor: '#f97316', fillOpacity: 1, weight: 2 })
      .bindTooltip(`Punto de referencia: ${origin.name}`)
      .addTo(g)
    for (const l of lodgings) {
      const marker = L.circleMarker([l.latitude, l.longitude], { radius: 7, color: '#0f172a', fillColor: '#14b8a6', fillOpacity: 0.95, weight: 2 })
        .bindTooltip(`${l.name} · ${formatDistance(l.distanceMeters)}`)
        .on('click', () => onSelect(l.id))
        .addTo(g)
      markers.current.set(l.id, marker)
    }
    m.fitBounds(L.latLng(center as [number, number]).toBounds(radiusMeters * 2), { padding: [16, 16] })
  }, [origin, radiusMeters, lodgings, onSelect])

  useEffect(() => {
    for (const [id, marker] of markers.current) {
      const selected = id === selectedId
      marker.setStyle({ fillColor: selected ? '#f43f5e' : '#14b8a6', radius: selected ? 10 : 7 })
      if (selected) marker.bringToFront()
    }
  }, [selectedId, lodgings])

  return (
    <div
      ref={el}
      role="region"
      aria-label="Mapa con el punto de referencia, el radio de búsqueda y los alojamientos localizados"
      className="h-72 w-full rounded-xl border border-slate-300 sm:h-96"
    />
  )
}
