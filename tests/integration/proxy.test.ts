import { buildOverpassQuery, handleGeocode, handlePlaces, resetProxyState, type ProxyDeps } from '../../functions/_lib/proxy'

const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

function makeDeps(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>, cache?: ProxyDeps['cache']): ProxyDeps & { calls: string[] } {
  const calls: string[] = []
  let t = 1_000_000
  return {
    calls,
    fetch: (async (url: string, init?: RequestInit) => {
      calls.push(String(url))
      return fetchImpl(String(url), init)
    }) as typeof fetch,
    cache,
    now: () => (t += 5000),
    sleep: async () => {},
  }
}

const req = (path: string, ip = '1.1.1.1') =>
  new Request(`https://x.test${path}`, { headers: { 'CF-Connecting-IP': ip } })

beforeEach(() => resetProxyState())

describe('proxy /api/geocode', () => {
  it('rechaza consultas cortas o largas', async () => {
    const deps = makeDeps(async () => okJson([]))
    expect((await handleGeocode(req('/api/geocode?q=a'), {}, deps)).status).toBe(400)
    expect((await handleGeocode(req(`/api/geocode?q=${'a'.repeat(200)}`), {}, deps)).status).toBe(400)
    expect(deps.calls).toHaveLength(0)
  })
  it('llama solo a Nominatim con User-Agent propio', async () => {
    let ua = ''
    const deps = makeDeps(async (_u, init) => {
      const h = (init?.headers ?? {}) as Record<string, string>
      ua = h['User-Agent'] ?? ''
      return okJson([{ place_id: 1 }])
    })
    const res = await handleGeocode(req('/api/geocode?q=Madrid%20Atocha'), { PROXY_CONTACT: 'a@b.c' }, deps)
    expect(res.status).toBe(200)
    expect(deps.calls[0]).toMatch(/^https:\/\/nominatim\.openstreetmap\.org\/search\?/)
    expect(ua).toContain('HotelScout')
    expect(ua).toContain('a@b.c')
  })
  it('propaga 429 del origen como rate_limited', async () => {
    const deps = makeDeps(async () => new Response('', { status: 429 }))
    const res = await handleGeocode(req('/api/geocode?q=Madrid'), {}, deps)
    expect(res.status).toBe(429)
    expect((await res.json()).error.code).toBe('rate_limited')
  })
  it.each([401, 403, 500])('convierte %i del origen en upstream_unavailable', async (status) => {
    const deps = makeDeps(async () => new Response('', { status }))
    const res = await handleGeocode(req('/api/geocode?q=Madrid'), {}, deps)
    expect(res.status).toBe(502)
    expect((await res.json()).error.code).toBe('upstream_unavailable')
  })
  it('convierte timeouts en 504', async () => {
    const deps = makeDeps(async () => { throw new DOMException('timeout', 'TimeoutError') })
    expect((await handleGeocode(req('/api/geocode?q=Madrid'), {}, deps)).status).toBe(504)
  })
  it('rechaza respuestas que no son JSON', async () => {
    const deps = makeDeps(async () => new Response('<html>', { status: 200 }))
    expect((await handleGeocode(req('/api/geocode?q=Madrid'), {}, deps)).status).toBe(502)
  })
  it('limita por IP', async () => {
    const deps = makeDeps(async () => okJson([]))
    let last = 200
    for (let i = 0; i < 25; i++) {
      // now() avanza 5 s por llamada: sólo cabe una parte de las peticiones en la ventana de 60 s
      last = (await handleGeocode(req(`/api/geocode?q=ciudad${i}`), {}, deps)).status
    }
    expect([200, 429]).toContain(last)
  })
  it('usa la caché y no repite la petición', async () => {
    const store = new Map<string, Response>()
    const cache: ProxyDeps['cache'] = {
      match: async (r) => store.get(r.url)?.clone(),
      put: async (r, res) => { store.set(r.url, res) },
    }
    const deps = makeDeps(async () => okJson([{ place_id: 1 }]), cache)
    await handleGeocode(req('/api/geocode?q=Sevilla'), {}, deps)
    const second = await handleGeocode(req('/api/geocode?q=sevilla'), {}, deps)
    expect(deps.calls).toHaveLength(1)
    expect(second.headers.get('X-HotelScout-Cache')).toBe('HIT')
  })
})

describe('proxy /api/places', () => {
  it('valida coordenadas y radio', async () => {
    const deps = makeDeps(async () => okJson({ elements: [] }))
    for (const path of ['/api/places', '/api/places?lat=95&lon=0&radius=500', '/api/places?lat=40&lon=-3&radius=50', '/api/places?lat=40&lon=-3&radius=99999', '/api/places?lat=x&lon=-3&radius=500']) {
      expect((await handlePlaces(req(path), {}, deps)).status).toBe(400)
    }
    expect(deps.calls).toHaveLength(0)
  })
  it('consulta Overpass con plantilla fija', async () => {
    const deps = makeDeps(async () => okJson({ elements: [] }))
    const res = await handlePlaces(req('/api/places?lat=40.4065&lon=-3.6895&radius=800'), {}, deps)
    expect(res.status).toBe(200)
    expect(deps.calls[0]).toBe('https://overpass-api.de/api/interpreter')
  })
  it('usa la instancia alternativa si la principal falla', async () => {
    let n = 0
    const deps = makeDeps(async () => (n++ === 0 ? new Response('', { status: 504 }) : okJson({ elements: [] })))
    const res = await handlePlaces(req('/api/places?lat=40.4&lon=-3.69&radius=800'), {}, deps)
    expect(res.status).toBe(200)
    expect(deps.calls[1]).toContain('private.coffee')
  })
  it('informa cuando todas las instancias fallan', async () => {
    const deps = makeDeps(async () => new Response('', { status: 429 }))
    const res = await handlePlaces(req('/api/places?lat=40.4&lon=-3.69&radius=800'), {}, deps)
    expect(res.status).toBe(429)
  })
  it('la consulta no admite inyección de parámetros', () => {
    const q = buildOverpassQuery(40.4, -3.69, 800)
    expect(q).toContain('around:800,40.4,-3.69')
  })
})

describe('proxy /api/places con Overpass saturado', () => {
  it('reintenta y termina en upstream_unavailable tras 3 intentos con 504', async () => {
    const deps = makeDeps(async () => new Response('', { status: 504 }))
    const res = await handlePlaces(req('/api/places?lat=40.4&lon=-3.69&radius=800'), {}, deps)
    expect(res.status).toBe(502)
    expect(deps.calls).toHaveLength(3)
  })
})

describe('proxy /api/places: Overpass devuelve 200 con error dentro', () => {
  it('un «remark» de tiempo agotado se trata como error y no como «sin alojamientos»', async () => {
    const deps = makeDeps(async () => okJson({ elements: [], remark: 'runtime error: Query timed out in "query" at line 3 after 22 seconds.' }))
    const res = await handlePlaces(req('/api/places?lat=40.4&lon=-3.69&radius=5000'), {}, deps)
    expect(res.status).toBe(504)
    expect((await res.json()).error.code).toBe('upstream_unavailable')
    expect(deps.calls).toHaveLength(3)
  })
  it('no guarda en caché una respuesta con error', async () => {
    const store = new Map<string, Response>()
    const cache: ProxyDeps['cache'] = { match: async (r) => store.get(r.url)?.clone(), put: async (r, res) => { store.set(r.url, res) } }
    const deps = makeDeps(async () => okJson({ elements: [], remark: 'runtime error: out of memory' }), cache)
    await handlePlaces(req('/api/places?lat=40.4&lon=-3.69&radius=5000'), {}, deps)
    expect(store.size).toBe(0)
  })
  it('recupera con la segunda instancia si la primera falla dentro del 200', async () => {
    let n = 0
    const deps = makeDeps(async () => okJson(n++ === 0 ? { elements: [], remark: 'runtime error: timed out' } : { elements: [{ type: 'node', id: 1 }] }))
    const res = await handlePlaces(req('/api/places?lat=40.4&lon=-3.69&radius=800'), {}, deps)
    expect(res.status).toBe(200)
    expect((await res.json()).elements).toHaveLength(1)
  })
})
