import { GeoError, nominatimResponseSchema, overpassResponseSchema, type Lodging, type Place } from '../../types/geo'
import type { LatLon } from '../../utils/geo'
import { dedupePlaces, normalizeLodgings, normalizePlaces } from './normalize'

const TIMEOUT_MS = 55_000

async function getJson(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
  const url = `${path}?${new URLSearchParams(params).toString()}`
  let res: Response
  try {
    res = await fetch(url, {
      signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new GeoError('network', 'No se pudo conectar. Comprueba tu conexión a Internet.')
  }
  if (!res.ok) {
    if (res.status === 429) throw new GeoError('rate_limited', 'Se alcanzó el límite de consultas. Espera un momento.')
    if (res.status === 400) throw new GeoError('invalid_request', 'La consulta no es válida.')
    throw new GeoError('upstream_unavailable', 'El servicio de mapas no está disponible temporalmente.')
  }
  try {
    return await res.json()
  } catch {
    throw new GeoError('invalid_response', 'Respuesta inesperada del servicio de mapas.')
  }
}

/** Busca lugares por texto. Se llama solo al pulsar «Buscar» (sin autocompletado). */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 2) throw new GeoError('invalid_request', 'Escribe al menos 2 caracteres.')
  const json = await getJson('/api/geocode', { q }, signal)
  const parsed = nominatimResponseSchema.safeParse(json)
  if (!parsed.success) throw new GeoError('invalid_response', 'Respuesta inesperada del servicio de mapas.')
  return dedupePlaces(normalizePlaces(parsed.data))
}

export interface LodgingSearchResult {
  lodgings: Lodging[]
  /** true si Overpass indicó que el resultado puede estar truncado. */
  truncated: boolean
}

/** Localiza alojamientos de OpenStreetMap dentro del radio (metros) alrededor del punto. */
export async function searchLodgings(
  origin: LatLon,
  radiusMeters: number,
  signal?: AbortSignal,
): Promise<LodgingSearchResult> {
  const json = await getJson(
    '/api/places',
    { lat: String(origin.latitude), lon: String(origin.longitude), radius: String(radiusMeters) },
    signal,
  )
  const parsed = overpassResponseSchema.safeParse(json)
  if (!parsed.success) throw new GeoError('invalid_response', 'Respuesta inesperada del servicio de mapas.')
  const all = normalizeLodgings(parsed.data.elements, origin)
  return {
    lodgings: all.filter((l) => l.distanceMeters <= radiusMeters),
    truncated: Boolean(parsed.data.remark),
  }
}
