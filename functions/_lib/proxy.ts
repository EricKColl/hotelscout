/**
 * Proxy propio hacia Nominatim y Overpass (D-002).
 * - Solo hosts fijos y parámetros validados: no admite URLs arbitrarias.
 * - Identifica la aplicación con User-Agent propio.
 * - Caché (Cache API de Cloudflare cuando existe) y límite por IP (por instancia, "mejor esfuerzo").
 * - Nominatim: como máximo 1 petición/segundo por instancia.
 * - Si el móvil pierde la conexión a mitad (túnel, cambio de antena), la consulta sigue y se guarda en caché
 *   con `waitUntil`, de modo que el reintento sale de la caché sin volver a cargar Overpass.
 */

export interface ProxyEnv {
  PROXY_CONTACT?: string
}

export interface ProxyDeps {
  fetch: typeof fetch
  cache?: { match(req: Request): Promise<Response | undefined>; put(req: Request, res: Response): Promise<void> }
  now: () => number
  sleep: (ms: number) => Promise<void>
  /**
   * `context.waitUntil` de Cloudflare Pages Functions: mantiene viva la consulta hasta 30 s después de que el
   * cliente se desconecte (documentación oficial de Cloudflare, consultada el 2026-09-25). Opcional (dev y pruebas).
   */
  waitUntil?: (promise: Promise<unknown>) => void
}

export const defaultDeps = (): ProxyDeps => ({
  fetch: (...args) => fetch(...args),
  cache: (globalThis as unknown as { caches?: { default?: ProxyDeps['cache'] } }).caches?.default,
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
})

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
// Overpass público responde 504 con frecuencia cuando está saturado: principal, alternativa y un último intento en la principal.
const OVERPASS_ATTEMPTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]
const OVERPASS_TIMEOUT_MS = 15_000
export const OVERPASS_LIMIT = 500
const UPSTREAM_TIMEOUT_MS = 20_000
const GEOCODE_TTL_S = 60 * 60 * 24 * 7
const PLACES_TTL_S = 60 * 60 * 24
const MAX_RADIUS_M = 5000
const MIN_RADIUS_M = 100

// Límite por IP: estado en memoria de la instancia (no global). Mejor esfuerzo.
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 20
const hits = new Map<string, number[]>()
let lastNominatimAt = 0

export function resetProxyState(): void {
  hits.clear()
  lastNominatimAt = 0
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  })
}

function errorResponse(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status)
}

function userAgent(env: ProxyEnv): string {
  const contact = env.PROXY_CONTACT?.trim()
  return `HotelScout/0.1 (proyecto personal sin ánimo de lucro${contact ? `; contacto: ${contact}` : ''})`
}

function rateLimited(ip: string, now: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > RATE_MAX
}

function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'local'
}

async function withCache(
  key: string,
  ttl: number,
  deps: ProxyDeps,
  produce: () => Promise<Response>,
): Promise<Response> {
  const cacheKey = new Request(key, { method: 'GET' })
  const hit = await deps.cache?.match(cacheKey)
  if (hit) {
    const res = new Response(hit.body, hit)
    res.headers.set('X-HotelScout-Cache', 'HIT')
    return res
  }
  const cache = deps.cache
  const pending = produce().then(async (res) => {
    if (res.ok && cache) {
      const cached = new Response(res.clone().body, res)
      cached.headers.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`)
      await cache.put(cacheKey, cached)
    }
    return res
  })
  // Sin esto, Cloudflare cancela la consulta en cuanto el móvil se desconecta y el resultado se pierde.
  deps.waitUntil?.(pending.catch(() => undefined))
  const res = await pending
  res.headers.set('X-HotelScout-Cache', 'MISS')
  return res
}

export async function handleGeocode(request: Request, env: ProxyEnv, deps: ProxyDeps = defaultDeps()): Promise<Response> {
  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim().replace(/\s+/g, ' ')
  if (q.length < 2 || q.length > 120) return errorResponse(400, 'invalid_request', 'La búsqueda debe tener entre 2 y 120 caracteres.')

  if (rateLimited(clientIp(request), deps.now())) {
    return errorResponse(429, 'rate_limited', 'Demasiadas consultas. Espera un minuto.')
  }

  const upstream = new URL(NOMINATIM)
  upstream.searchParams.set('format', 'jsonv2')
  upstream.searchParams.set('q', q)
  upstream.searchParams.set('limit', '8')
  upstream.searchParams.set('addressdetails', '1')
  upstream.searchParams.set('accept-language', 'es')
  const cacheKey = `https://cache.hotelscout.internal/geocode?q=${encodeURIComponent(q.toLowerCase())}`

  return withCache(cacheKey, GEOCODE_TTL_S, deps, async () => {
    const wait = 1100 - (deps.now() - lastNominatimAt)
    if (wait > 0) {
      if (wait > 3000) return errorResponse(429, 'rate_limited', 'El servicio de mapas está ocupado. Inténtalo en unos segundos.')
      await deps.sleep(wait)
    }
    lastNominatimAt = deps.now()
    return callUpstream(upstream.toString(), { method: 'GET' }, env, deps)
  })
}

const round = (n: number, d: number) => Number(n.toFixed(d))

export function buildOverpassQuery(lat: number, lon: number, radius: number): string {
  return (
    `[out:json][timeout:20];` +
    `nwr["tourism"~"^(hotel|hostel|guest_house|motel|apartment|chalet)$"]["name"](around:${radius},${lat},${lon});` +
    `out center tags ${OVERPASS_LIMIT};`
  )
}

/**
 * Overpass responde 200 aunque la consulta haya fallado (tiempo agotado, memoria) y lo cuenta en "remark".
 * Eso NO es "sin alojamientos": se trata como error (y no se guarda en caché).
 * Si se alcanza el límite de elementos, se marca como resultado parcial.
 */
export function inspectOverpassBody(text: string): { ok: true; body: string } | { ok: false } {
  let json: { elements?: unknown; remark?: unknown }
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false }
  }
  if (!Array.isArray(json.elements)) return { ok: false }
  if (typeof json.remark === 'string' && /runtime error|timed out|out of memory|too many|rate_limit/i.test(json.remark)) {
    return { ok: false }
  }
  const truncated = json.elements.length >= OVERPASS_LIMIT
  return { ok: true, body: JSON.stringify({ ...json, truncated }) }
}

export async function handlePlaces(request: Request, env: ProxyEnv, deps: ProxyDeps = defaultDeps()): Promise<Response> {
  const p = new URL(request.url).searchParams
  const lat = Number(p.get('lat'))
  const lon = Number(p.get('lon'))
  const radius = Math.round(Number(p.get('radius')))
  if (
    !p.get('lat') || !p.get('lon') || !p.get('radius') ||
    !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(radius) ||
    Math.abs(lat) > 90 || Math.abs(lon) > 180 || radius < MIN_RADIUS_M || radius > MAX_RADIUS_M
  ) {
    return errorResponse(400, 'invalid_request', `Coordenadas o radio no válidos (radio entre ${MIN_RADIUS_M} y ${MAX_RADIUS_M} m).`)
  }
  if (rateLimited(clientIp(request), deps.now())) {
    return errorResponse(429, 'rate_limited', 'Demasiadas consultas. Espera un minuto.')
  }

  // Se cuantiza (~11 m) para mejorar la tasa de aciertos de caché sin cambiar el resultado de forma apreciable.
  const qLat = round(lat, 4)
  const qLon = round(lon, 4)
  const qRadius = Math.ceil(radius / 100) * 100
  const cacheKey = `https://cache.hotelscout.internal/places?lat=${qLat}&lon=${qLon}&r=${qRadius}`

  return withCache(cacheKey, PLACES_TTL_S, deps, async () => {
    const body = new URLSearchParams({ data: buildOverpassQuery(qLat, qLon, qRadius) })
    let last: Response | undefined
    for (const instance of OVERPASS_ATTEMPTS) {
      const res = await callUpstream(
        instance,
        { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        env,
        deps,
        OVERPASS_TIMEOUT_MS,
      )
      if (res.ok) {
        const checked = inspectOverpassBody(await res.clone().text())
        if (checked.ok) {
          return new Response(checked.body, { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
        }
        last = errorResponse(504, 'upstream_unavailable', 'Overpass no pudo completar la consulta (demasiado grande o saturado).')
        continue
      }
      last = res
      if (res.status === 400 || res.status === 429) break
    }
    return last ?? errorResponse(502, 'upstream_unavailable', 'Servicio no disponible.')
  })
}

async function callUpstream(
  url: string,
  init: RequestInit,
  env: ProxyEnv,
  deps: ProxyDeps,
  timeoutMs = UPSTREAM_TIMEOUT_MS,
): Promise<Response> {
  try {
    const res = await deps.fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), 'User-Agent': userAgent(env), Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (res.status === 429) return errorResponse(429, 'rate_limited', 'El servicio de mapas ha limitado las consultas.')
    if (!res.ok) return errorResponse(502, 'upstream_unavailable', `El servicio de mapas respondió ${res.status}.`)
    const text = await res.text()
    try {
      JSON.parse(text)
    } catch {
      return errorResponse(502, 'upstream_unavailable', 'Respuesta no válida del servicio de mapas.')
    }
    return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
  } catch {
    return errorResponse(504, 'upstream_unavailable', 'El servicio de mapas tardó demasiado en responder.')
  }
}
