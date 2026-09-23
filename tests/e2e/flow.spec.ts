import { expect, test, type Page } from '@playwright/test'

/**
 * E2E con las respuestas de /api simuladas (mocks explícitos de test; nunca en producción).
 * La comprobación real contra Nominatim/Overpass está en tests/live.
 */
const ATOCHA = {
  place_id: 1, osm_type: 'node', osm_id: 5, lat: '40.4070', lon: '-3.6885',
  display_name: 'Atocha, Madrid, España', name: 'Atocha', category: 'railway', type: 'station',
  address: { city: 'Madrid', country: 'España' },
}
const OTRA = { ...ATOCHA, place_id: 2, osm_id: 6, display_name: 'Atocha, Otra Ciudad, España', lat: '41.0', lon: '-4.0', address: { city: 'Otra Ciudad' } }

const OVERPASS = {
  elements: [
    { type: 'node', id: 1, lat: 40.4075, lon: -3.689, tags: { tourism: 'hotel', name: 'Hotel Test Uno', stars: '4', website: 'https://example.com' } },
    { type: 'way', id: 2, center: { lat: 40.41, lon: -3.685 }, tags: { tourism: 'hostel', name: 'Hostal Test Dos' } },
    { type: 'node', id: 3, lat: 40.403, lon: -3.69, tags: { tourism: 'apartment', name: 'Apartamento Test Tres' } },
  ],
}

async function mockApi(page: Page, opts: { geocode?: unknown; places?: unknown; placesStatus?: number } = {}) {
  await page.route('**/api/geocode*', (r) => r.fulfill({ json: opts.geocode ?? [ATOCHA] }))
  await page.route('**/api/places*', (r) =>
    r.fulfill({ status: opts.placesStatus ?? 200, json: opts.places ?? OVERPASS }),
  )
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort())
}

test.beforeEach(async ({ page }) => {
  // Limpia el almacenamiento solo al abrir la pestaña, no en cada recarga (para probar la persistencia).
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__e2e_init')) {
      localStorage.clear()
      sessionStorage.setItem('__e2e_init', '1')
    }
  })
})

test('flujo completo: buscar, filtrar, ordenar, mapa, enlace, favorito e historial', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alojamientos cerca')

  await page.getByLabel('Lugar de referencia').fill('Atocha')
  await page.getByLabel('Tipo de lugar').selectOption('train_station')
  await page.getByLabel('Adultos').fill('3')
  await page.getByLabel('Distancia máxima (en línea recta)').selectOption('800')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()

  await expect(page.getByRole('heading', { name: /Alojamientos cerca de Atocha/ })).toBeVisible()
  await expect(page.getByText('3 alojamiento(s) localizado(s)')).toBeVisible()
  await expect(page.getByText('0 ofertas verificadas')).toBeVisible()
  await expect(page.locator('.leaflet-container')).toBeVisible()
  await expect(page.locator('.leaflet-interactive').first()).toBeVisible()

  // Ningún precio inventado
  await expect(page.getByText('Consultar precio').first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText('€')

  // Ordenación por distancia por defecto
  const names = page.locator('li h3')
  await expect(names.first()).toContainText('Hotel Test Uno')

  // Ordenar por nombre
  await page.getByLabel('Ordenar por').selectOption('name')
  await expect(names.first()).toContainText('Apartamento Test Tres')

  // Filtro por tipo
  await page.getByLabel('Albergue / hostal').check()
  await expect(names).toHaveCount(1)
  await expect(names.first()).toContainText('Hostal Test Dos')
  await page.getByLabel('Albergue / hostal').uncheck()
  await expect(names).toHaveCount(3)

  // Enlace de búsqueda: etiqueta honesta y parámetros conservados
  const card = page.locator('li', { has: page.getByRole('heading', { name: 'Hotel Test Uno' }) }).first()
  const link = card.getByRole('link', { name: /Buscar en Booking\.com/ })
  const href = (await link.getAttribute('href'))!
  const url = new URL(href)
  expect(url.hostname).toBe('www.booking.com')
  expect(url.searchParams.get('group_adults')).toBe('3')
  expect(url.searchParams.get('ss')).toBe('Hotel Test Uno')
  expect(url.searchParams.get('dest_type')).toBe('latlong')
  expect(url.searchParams.get('latitude')).toBe('40.407500')
  expect(url.searchParams.get('order')).toBe('distance_from_search')
  expect(await link.getAttribute('rel')).toBe('noopener noreferrer')
  expect(await link.getAttribute('target')).toBe('_blank')

  // Favorito persistente
  await card.getByRole('button', { name: /Guardar Hotel Test Uno en favoritos/ }).click()
  await expect(page.getByRole('heading', { name: /Favoritos/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: /Favoritos/ })).toBeVisible()
  await expect(page.getByText('Hotel Test Uno').first()).toBeVisible()

  // Historial recuperable
  await expect(page.getByRole('heading', { name: 'Búsquedas recientes' })).toBeVisible()
  await page.getByRole('button', { name: /Atocha.*800 m/ }).click()
  await expect(page.getByRole('heading', { name: /Alojamientos cerca de Atocha/ })).toBeVisible()

  // Borrar todos los datos locales
  await page.getByRole('button', { name: 'Borrar todos mis datos locales' }).click()
  await expect(page.getByRole('heading', { name: /Favoritos/ })).toHaveCount(0)
})

test('validaciones del formulario', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByText(/Escribe un lugar/)).toBeVisible()

  await page.getByLabel('Lugar de referencia').fill('Atocha')
  await page.getByLabel('Salida').fill('2020-01-01')
  await page.getByLabel('Entrada').fill('2020-01-01')
  await page.getByLabel('Adultos').fill('0')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByText('La fecha de entrada no puede estar en el pasado.')).toBeVisible()
  await expect(page.getByText('Debe haber al menos 1 adulto.')).toBeVisible()
})

test('varias coincidencias: obliga a elegir', async ({ page }) => {
  await mockApi(page, { geocode: [ATOCHA, OTRA] })
  await page.goto('/')
  await page.getByLabel('Lugar de referencia').fill('Atocha')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByRole('heading', { name: /varias coincidencias/ })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: /Alojamientos cerca de/ })).toHaveCount(0)
  await page.getByRole('button', { name: /Otra Ciudad/ }).click()
  await expect(page.getByRole('heading', { name: /Alojamientos cerca de Atocha/ })).toBeVisible()
})

test('sin resultados de lugar', async ({ page }) => {
  await mockApi(page, { geocode: [] })
  await page.goto('/')
  await page.getByLabel('Lugar de referencia').fill('zzzzzz')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByText('No se encontró ese lugar')).toBeVisible()
})

test('sin alojamientos ≠ error: mensajes distintos', async ({ page }) => {
  await mockApi(page, { places: { elements: [] } })
  await page.goto('/')
  await page.getByLabel('Lugar de referencia').fill('Atocha')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByText('Sin alojamientos encontrados en OpenStreetMap')).toBeVisible()
  await expect(page.getByText(/Límite de solicitudes|no está disponible/)).toHaveCount(0)
})

test('límite de solicitudes (429) no se presenta como "sin resultados"', async ({ page }) => {
  await mockApi(page, { placesStatus: 429, places: { error: { code: 'rate_limited' } } })
  await page.goto('/')
  await page.getByLabel('Lugar de referencia').fill('Atocha')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByText('Límite de solicitudes alcanzado')).toBeVisible()
  await expect(page.getByText('Sin alojamientos encontrados')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
})

test('error del servicio (502) y reintento correcto', async ({ page }) => {
  let n = 0
  await page.route('**/api/geocode*', (r) => r.fulfill({ json: [ATOCHA] }))
  await page.route('**/api/places*', (r) => (n++ === 0 ? r.fulfill({ status: 502, json: { error: {} } }) : r.fulfill({ json: OVERPASS })))
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort())
  await page.goto('/')
  await page.getByLabel('Lugar de referencia').fill('Atocha')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByText('Servicio de mapas temporalmente no disponible')).toBeVisible()
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('3 alojamiento(s) localizado(s)')).toBeVisible()
})

test('sin conexión: aviso visible', async ({ page, context }) => {
  await mockApi(page)
  await page.goto('/')
  await context.setOffline(true)
  await expect(page.getByText('Sin conexión')).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText('Sin conexión')).toHaveCount(0)
})

test('el navegador no llama directamente a Nominatim ni Overpass', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (/nominatim|overpass/.test(u.hostname)) external.push(r.url())
  })
  await mockApi(page)
  await page.goto('/')
  await page.getByLabel('Lugar de referencia').fill('Atocha')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByText('3 alojamiento(s) localizado(s)')).toBeVisible()
  expect(external).toEqual([])
})

test('no hay peticiones por cada pulsación (sin autocompletado)', async ({ page }) => {
  let calls = 0
  await page.route('**/api/geocode*', (r) => { calls++; return r.fulfill({ json: [ATOCHA] }) })
  await page.goto('/')
  await page.getByLabel('Lugar de referencia').pressSequentially('Atocha Madrid', { delay: 20 })
  await page.waitForTimeout(500)
  expect(calls).toBe(0)
})

test('móvil: sin desbordamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await mockApi(page)
  await page.goto('/')
  await page.getByLabel('Lugar de referencia').fill('Atocha')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByText('3 alojamiento(s) localizado(s)')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('almacenamiento local dañado: la app arranca igual', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hotelscout:favorites:v1', '{roto')
    localStorage.setItem('hotelscout:history:v1', JSON.stringify({ no: 'lista' }))
  })
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alojamientos cerca')
  await expect(page.getByLabel('Lugar de referencia')).toBeVisible()
})

test('más habitaciones que adultos y fechas demasiado lejanas se avisan antes de buscar', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await page.getByLabel('Lugar de referencia').fill('Atocha')
  await page.getByLabel('Adultos').fill('1')
  await page.getByLabel('Habitaciones').fill('3')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByText('No puede haber más habitaciones que adultos.')).toBeVisible()
  await page.getByLabel('Habitaciones').fill('1')
  await page.getByLabel('Entrada').fill('2030-01-01')
  await page.getByLabel('Salida').fill('2030-01-03')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByText(/16 meses/)).toBeVisible()
})
