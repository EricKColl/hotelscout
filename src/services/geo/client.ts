import { GeoError, nominatimResponseSchema, overpassResponseSchema, type Lodging, type Place } from '../../types/geo'
import type { LatLon } from '../../utils/geo'
import { dedupePlaces, normalizeLodgings, normalizePlaces } from './normalize'

const TIMEOUT_MS = 55_000

const TIMEOUT_MESSAGE =
  'La respuesta tardó demasiado. Puede ser una cobertura móvil débil o el servidor de mapas saturado: vuelve a intentarlo.'

/**
 * Señal que se cancela al pasar `ms` o si se cancela `outer` (la de TanStack Query).
 * Antes, si llegaba `outer`, no había tiempo límite: con datos móviles una conexión colgada
 * (cambio de antena, túnel, Wi‑Fi ↔ datos) podía dejar la búsqueda «cargando» indefinidamente.
 * No usa AbortSignal.any/timeout porque no existen en Safari antiguo.
 */
function deadline(ms: number, outer?: AbortSignal): { signal: AbortSignal; timedOut: () => boolean; done: () => void } {
  const controller = new AbortController()
  let expired = false
  const timer = setTimeout(() => {
    expired = true
    controller.abort()
  }, ms)
  const onOuterAbort = () => controller.abort()
  if (outer?.aborted) controller.abort()
  else outer?.addEventListener('abort', onOuterAbort, { once: true })
  return {
    signal: controller.signal,
    timedOut: () => expired,
    done: () => {
      clearTimeout(timer)
      outer?.removeEventListener('abort', onOuterAbort)
    },
  }
}

async function getJson(path: string, params: Record<string, string>, signal?: AbortSignal, timeoutMs = TIMEOUT_MS): Promise<unknown> {
  const url = `${path}?${new URLSearchParams(params).toString()}`
  const limit = deadline(timeoutMs, signal)
  // Cancelación pedida por quien llama (p. ej. nueva búsqueda): se propaga tal cual, no es un error de conexión.
  const failure = (error: unknown): never => {
    if (signal?.aborted) throw error
    if (limit.timedOut()) throw new GeoError('network', TIMEOUT_MESSAGE)
    throw new GeoError('network', 'No se pudo conectar. Comprueba tu conexión a Internet (datos móviles o Wi‑Fi).', { connectionDropped: true })
  }
  try {
    let res: Response
    try {
      res = await fetch(url, { signal: limit.signal, headers: { Accept: 'application/json' } })
    } catch (error) {
      return failure(error)
    }
    if (!res.ok) {
      if (res.status === 429) throw new GeoError('rate_limited', 'Se alcanzó el límite de consultas. Espera un momento.')
      if (res.status === 400) throw new GeoError('invalid_request', 'La consulta no es válida.')
      throw new GeoError('upstream_unavailable', 'El servicio de mapas no está disponible temporalmente.')
    }
    let text: string
    try {
      // El cuerpo también puede cortarse a mitad con una cobertura inestable.
      text = await res.text()
    } catch (error) {
      return failure(error)
    }
    try {
      return JSON.parse(text)
    } catch {
      throw new GeoError('invalid_response', 'Respuesta inesperada del servicio de mapas.')
    }
  } finally {
    limit.done()
  }
}

/** Reintento automático (una sola vez) cuando la conexión se cortó antes de responder; nunca ante límites ni errores del servicio. */
export function shouldRetryOnce(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && error instanceof GeoError && error.connectionDropped
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
    truncated: Boolean(parsed.data.remark) || parsed.data.truncated === true,
  }
}
