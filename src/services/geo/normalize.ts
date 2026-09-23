import type { z } from 'zod'
import {
  type Lodging,
  type OsmElement,
  type Place,
  type PlaceCategory,
  type nominatimResultSchema,
} from '../../types/geo'
import { haversineMeters, isValidCoordinate, type LatLon } from '../../utils/geo'

type NominatimResult = z.infer<typeof nominatimResultSchema>

function categorize(category?: string, type?: string): PlaceCategory {
  if (category === 'railway' && (type === 'station' || type === 'halt' || type === 'stop')) return 'train_station'
  if (category === 'building' && type === 'train_station') return 'train_station'
  if (category === 'public_transport' && type === 'station') return 'train_station'
  if (category === 'amenity' && type === 'bus_station') return 'bus_station'
  if (category === 'aeroway' && (type === 'aerodrome' || type === 'terminal')) return 'airport'
  if (category === 'place' || (category === 'boundary' && type === 'administrative')) return 'city'
  if (category === 'building' || category === 'highway' || type === 'house') return 'address'
  return 'other'
}

export function normalizePlaces(results: NominatimResult[]): Place[] {
  const places: Place[] = []
  for (const r of results) {
    const latitude = Number(r.lat)
    const longitude = Number(r.lon)
    if (!isValidCoordinate(latitude, longitude)) continue
    const a = r.address ?? {}
    places.push({
      id: `${r.osm_type ?? 'osm'}/${r.osm_id ?? r.place_id}`,
      name: r.name || r.display_name.split(',')[0]?.trim() || r.display_name,
      displayName: r.display_name,
      category: categorize(r.category, r.type),
      latitude,
      longitude,
      country: a.country,
      city: a.city ?? a.town ?? a.village ?? a.municipality,
    })
  }
  return places
}

const LODGING_KINDS = new Set(['hotel', 'hostel', 'guest_house', 'motel', 'apartment', 'chalet'])

const httpsOnly = (raw?: string): string | undefined => {
  if (!raw) return undefined
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const u = new URL(candidate)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined
    if (u.username || u.password) return undefined
    u.protocol = 'https:'
    return u.toString()
  } catch {
    return undefined
  }
}

/** Convierte elementos de Overpass en alojamientos con distancia real al punto de referencia. */
export function normalizeLodgings(elements: OsmElement[], origin: LatLon): Lodging[] {
  const seen = new Set<string>()
  const out: Lodging[] = []
  for (const el of elements) {
    const tags = el.tags ?? {}
    const kind = tags.tourism
    const name = tags.name?.trim()
    if (!kind || !LODGING_KINDS.has(kind) || !name) continue
    const latitude = el.lat ?? el.center?.lat
    const longitude = el.lon ?? el.center?.lon
    if (latitude === undefined || longitude === undefined || !isValidCoordinate(latitude, longitude)) continue
    const sourceId = `${el.type}/${el.id}`
    if (seen.has(sourceId)) continue
    seen.add(sourceId)
    const stars = Number(tags.stars)
    const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ')
    const address = [street, tags['addr:city']].filter(Boolean).join(', ') || undefined
    out.push({
      id: `osm:${sourceId}`,
      source: 'openstreetmap',
      sourceId,
      name,
      kind,
      latitude,
      longitude,
      distanceMeters: haversineMeters(origin, { latitude, longitude }),
      stars: Number.isFinite(stars) && stars >= 1 && stars <= 5 ? stars : undefined,
      websiteUrl: httpsOnly(tags.website ?? tags['contact:website']),
      phone: tags.phone ?? tags['contact:phone'],
      address,
    })
  }
  return out.sort((a, b) => a.distanceMeters - b.distanceMeters)
}

/** Coloca primero los lugares del tipo que el usuario dijo buscar; conserva el orden relativo del resto. */
export function rankPlaces(places: Place[], preferred?: PlaceCategory): Place[] {
  if (!preferred) return places
  return [...places.filter((p) => p.category === preferred), ...places.filter((p) => p.category !== preferred)]
}

/** Elimina coincidencias repetidas (mismo nombre y a menos de 200 m), típicas de OSM (parada + estación). */
export function dedupePlaces(places: Place[]): Place[] {
  const out: Place[] = []
  for (const p of places) {
    const dup = out.some((q) => q.name.toLowerCase() === p.name.toLowerCase() && q.category === p.category && haversineMeters(q, p) < 200)
    if (!dup) out.push(p)
  }
  return out
}
