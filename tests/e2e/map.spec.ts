import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * Mapa base (con respuestas simuladas; la comprobación visual con datos reales se hace a mano en la web publicada).
 * - Vectorial (OpenFreeMap) con etiquetas en español, compatible con la CSP de producción.
 * - Alternativa automática a las teselas de OpenStreetMap si el mapa vectorial no carga.
 */
test.use({ serviceWorkers: 'block' })
// El mapa puede seguir descargando MapLibre al acabar la prueba: se retiran las rutas sin dar error.
test.afterEach(({ page }) => page.unrouteAll({ behavior: 'ignoreErrors' }))

const OFM = 'https://tiles.openfreemap.org'
const CORS = { 'access-control-allow-origin': '*' }

const ORIGIN = { lat: 35.6812, lon: 139.7671 }
const GEOCODE = [{ place_id: 1, osm_type: 'node', osm_id: 1, lat: String(ORIGIN.lat), lon: String(ORIGIN.lon), display_name: 'Estación de Tokio, Chiyoda, Tokio, Japón', name: 'Estación de Tokio', category: 'railway', type: 'station', address: { city: 'Tokio', country: 'Japón' } }]
const hotel = (id: number, dLat: number, tags: Record<string, string>) => ({ type: 'node', id, lat: ORIGIN.lat + dLat, lon: ORIGIN.lon, tags: { tourism: 'hotel', ...tags } })

// Estilo mínimo con la misma estructura que el real: fuente vectorial por TileJSON, tipografías y una etiqueta de nombre.
const STYLE = {
  version: 8,
  glyphs: `${OFM}/fonts/{fontstack}/{range}.pbf`,
  sources: { openmaptiles: { type: 'vector', url: `${OFM}/planet` } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#f8f4f0' } },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#9cc0f9' } },
    {
      id: 'label_city', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place',
      layout: { 'text-font': ['Noto Sans Regular'], 'text-field': ['case', ['has', 'name:nonlatin'], ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']], ['coalesce', ['get', 'name_en'], ['get', 'name']]] },
    },
  ],
}

async function mockApi(page: Page, elements: unknown[]) {
  // Como Cloudflare Pages: la CSP de public/_headers (copiado a dist) en todas las respuestas del propio dominio.
  const headers = await (await page.request.get('/_headers')).text()
  const csp = /Content-Security-Policy: (.+)/.exec(headers)?.[1]?.trim()
  expect(csp).toContain("connect-src 'self' https://tiles.openfreemap.org")
  await page.route('http://localhost:4173/**', async (route) => {
    if (new URL(route.request().url()).pathname.startsWith('/api/')) return route.fallback()
    const response = await route.fetch()
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp! } })
  })
  await page.route('**/api/geocode*', (r) => r.fulfill({ json: GEOCODE }))
  await page.route('**/api/places*', (r) => r.fulfill({ json: { elements } }))
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort())
}

async function search(page: Page) {
  await page.goto('/')
  await page.getByLabel('Lugar de referencia').fill('Estación de Tokio')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.locator('.leaflet-container')).toBeVisible()
}

test('mapa vectorial de OpenFreeMap con la CSP de producción y sin llamar a otras webs', async ({ page }) => {
  const hasWebGL2 = await page.evaluate(() => Boolean(document.createElement('canvas').getContext('webgl2')))
  test.skip(!hasWebGL2, 'Este navegador de pruebas no tiene WebGL2 (la app usaría el mapa de OSM)')

  const violations: string[] = []
  page.on('console', (m) => {
    if (/Content Security Policy/i.test(m.text())) violations.push(m.text())
  })
  const hosts = new Set<string>()
  page.on('request', (r) => hosts.add(new URL(r.url()).hostname))
  await mockApi(page, [hotel(1, 0.002, { name: 'Hotel Test' })])
  await page.route(`${OFM}/**`, (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/styles/liberty') return route.fulfill({ json: STYLE, headers: CORS })
    if (path === '/planet') return route.fulfill({ json: { tilejson: '3.0.0', tiles: [`${OFM}/planet/test/{z}/{x}/{y}.pbf`], minzoom: 0, maxzoom: 14 }, headers: CORS })
    if (path.startsWith('/planet/test/')) return route.fulfill({ body: '', contentType: 'application/x-protobuf', headers: CORS })
    return route.fulfill({ status: 404, body: '', headers: CORS })
  })

  await search(page)
  await expect(page.locator('.leaflet-gl-layer canvas')).toBeVisible()
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenFreeMap')
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap')
  await page.waitForTimeout(1500) // margen por si el mapa vectorial fallase y cambiara al de OSM
  await expect(page.locator('img.leaflet-tile')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Acercar' })).toBeVisible()
  expect(violations).toEqual([])
  expect([...hosts].filter((h) => h !== 'localhost').sort()).toEqual(['tiles.openfreemap.org'])
})

for (const [caso, reply] of [
  ['no responde', (r: Route) => r.abort()],
  ['devuelve un estilo no válido', (r: Route) => r.fulfill({ body: '<html>error</html>', contentType: 'text/html', headers: CORS })],
] as const) {
  test(`si OpenFreeMap ${caso}, se usa el mapa de OpenStreetMap`, async ({ page }) => {
    await mockApi(page, [hotel(1, 0.002, { name: 'Hotel Test' })])
    await page.route(`${OFM}/**`, reply)
    await search(page)
    await expect(page.locator('img.leaflet-tile').first()).toBeAttached()
    await expect(page.locator('.leaflet-gl-layer')).toHaveCount(0)
    await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap')
    await expect(page.locator('.leaflet-control-attribution')).not.toContainText('OpenFreeMap')
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible()
  })
}

test('hoteles con nombre en japonés: traducción de OSM, nombre local y Booking con el nombre original', async ({ page }) => {
  await mockApi(page, [
    hotel(1, 0.002, { name: 'ホテル東京', 'name:en': 'Hotel Tokyo' }),
    hotel(2, 0.003, { name: '丸の内ホテル' }),
  ])
  await page.route(`${OFM}/**`, (r) => r.abort())
  await search(page)
  const card = page.locator('li', { has: page.getByRole('heading', { name: 'Hotel Tokyo' }) }).first()
  await expect(card.getByText('Nombre local: ホテル東京')).toBeVisible()
  const href = await card.getByRole('link', { name: /Buscar en Booking\.com/ }).getAttribute('href')
  expect(new URL(href!).searchParams.get('ss')).toBe('ホテル東京')
  // Sin traducción en OSM se muestra el original, sin inventar nada.
  await expect(page.getByRole('heading', { name: '丸の内ホテル' })).toBeVisible()
})

test('al pulsar un alojamiento en el mapa, la lista se desplaza hasta su ficha', async ({ page }) => {
  const many = Array.from({ length: 14 }, (_, i) => hotel(i + 1, 0.0005 * (i + 1), { name: `Hotel ${String(i + 1).padStart(2, '0')}` }))
  await mockApi(page, many)
  await page.route(`${OFM}/**`, (r) => r.abort())
  await search(page)
  const last = page.locator('li', { has: page.getByRole('heading', { name: 'Hotel 14' }) }).first()
  await expect(last).not.toBeInViewport()
  // Capas interactivas: radio, punto de referencia y después los alojamientos en orden de distancia.
  await page.locator('path.leaflet-interactive').nth(2 + 13).click()
  await expect(last).toBeInViewport()
  await expect(last).toHaveClass(/border-rose-500/)
})
