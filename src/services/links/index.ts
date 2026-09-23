import type { Trip } from '../../schemas/search'
import { isValidCoordinate } from '../../utils/geo'

/**
 * Enlaces a plataformas externas (decisión D-004).
 * - «Buscar en Booking.com»: funciona pero NO está documentado oficialmente para uso público.
 *   Es un enlace de BÚSQUEDA: nunca se presenta como oferta ni con precio. Sin parámetro de afiliado.
 * - Web del alojamiento: dato de OpenStreetMap, se valida y se fuerza HTTPS.
 * - Mapa: enlace público de OpenStreetMap a las coordenadas.
 */

export type LinkKind = 'search' | 'official_site' | 'map'

export interface ExternalLink {
  kind: LinkKind
  label: string
  url: string
  /** Texto para explicar qué hace el enlace (accesibilidad y transparencia). */
  note: string
}

const ALLOWED_HOSTS = new Set(['www.booking.com', 'www.openstreetmap.org'])

/** HTTPS, sin credenciales; para dominios propios de la app exige lista blanca. */
export function isSafeExternalUrl(raw: string, opts: { restrictHosts: boolean } = { restrictHosts: true }): boolean {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  if (u.username || u.password) return false
  if (opts.restrictHosts && !ALLOWED_HOSTS.has(u.hostname)) return false
  return true
}

export interface BookingTarget {
  name: string
  latitude: number
  longitude: number
}

/**
 * Búsqueda en Booking centrada en las COORDENADAS del alojamiento y ordenada por distancia a ese punto.
 * Motivo: con `ss=<nombre, ciudad>` Booking interpreta el texto y falla a menudo (lo manda a otro destino,
 * p. ej. «Fráncfort del Meno» → Menorca, o a su portada con `errorc_searchstring_not_found`).
 * Con dest_type=latlong siempre se resuelve, conserva fechas y huéspedes, y el alojamiento (si está en
 * Booking) sale el primero. Si no está en Booking, salen los más cercanos. Comprobado en un navegador real el 2026-09-23.
 */
export function buildBookingSearchUrl(target: BookingTarget, trip: Trip): string | undefined {
  const name = target.name.trim()
  if (!name || !isValidCoordinate(target.latitude, target.longitude)) return undefined
  const params = new URLSearchParams()
  params.set('ss', name)
  params.set('dest_type', 'latlong')
  params.set('latitude', target.latitude.toFixed(6))
  params.set('longitude', target.longitude.toFixed(6))
  params.set('order', 'distance_from_search')
  params.set('checkin', trip.checkIn)
  params.set('checkout', trip.checkOut)
  params.set('group_adults', String(trip.adults))
  params.set('no_rooms', String(trip.rooms))
  params.set('group_children', String(trip.childrenAges.length))
  for (const age of trip.childrenAges) params.append('age', String(age))
  const url = `https://www.booking.com/searchresults.html?${params.toString()}`
  return isSafeExternalUrl(url) ? url : undefined
}

export function buildOsmMapUrl(latitude: number, longitude: number): string {
  const lat = latitude.toFixed(6)
  const lon = longitude.toFixed(6)
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`
}

export interface LinkSubject {
  name: string
  city?: string
  latitude: number
  longitude: number
  websiteUrl?: string
}

export function buildLinksForLodging(subject: LinkSubject, trip: Trip | undefined): ExternalLink[] {
  const links: ExternalLink[] = []
  if (subject.websiteUrl && isSafeExternalUrl(subject.websiteUrl, { restrictHosts: false })) {
    links.push({
      kind: 'official_site',
      label: 'Web del alojamiento',
      url: subject.websiteUrl,
      note: 'Abre la web que figura en OpenStreetMap; puede estar desactualizada.',
    })
  }
  if (trip) {
    const url = buildBookingSearchUrl(subject, trip)
    if (url) {
      links.push({
        kind: 'search',
        label: 'Buscar en Booking.com',
        url,
        note: 'Abre Booking con tus fechas y los alojamientos más cercanos a este punto (el primero debería ser este, si está en Booking). El precio y la disponibilidad se comprueban allí.',
      })
    }
  }
  links.push({
    kind: 'map',
    label: 'Ver en mapa',
    url: buildOsmMapUrl(subject.latitude, subject.longitude),
    note: 'Abre OpenStreetMap en las coordenadas del alojamiento.',
  })
  return links
}
