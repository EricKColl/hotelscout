import { expect, test } from '@playwright/test'

test('PWA: manifest válido, service worker activo y app disponible sin conexión', async ({ page, context }) => {
  await page.goto('/')
  const manifestHref = await page.locator('link[rel=manifest]').getAttribute('href')
  const manifest = await (await page.request.get(manifestHref!)).json()
  expect(manifest.name).toBe('HotelScout')
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true)
  for (const icon of manifest.icons) expect((await page.request.get(icon.src)).ok()).toBe(true)

  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload() // la recarga ya queda controlada por el service worker
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alojamientos cerca')
  await expect(page.getByText('Sin conexión')).toBeVisible()
  await context.setOffline(false)
})

test('el service worker no guarda respuestas de /api', async ({ page }) => {
  await page.route('**/api/geocode*', (r) => r.fulfill({ json: [] }))
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  const cached = await page.evaluate(async () => {
    const keys: string[] = []
    for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) keys.push(new URL(req.url).pathname)
    return keys
  })
  expect(cached.some((p) => p.startsWith('/api/'))).toBe(false)
  expect(cached).toContain('/')
})

test('sin conexión desde la PRIMERA visita (la app se guarda al instalarse, sin necesidad de recargar antes)', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alojamientos cerca')
  await expect(page.getByLabel('Lugar de referencia')).toBeVisible()
  await expect(page.getByText('Sin conexión')).toBeVisible()
  await context.setOffline(false)
})

test('cobertura débil («con rayitas pero sin datos»): la app abre en segundos con la copia guardada', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  // La red acepta la petición pero no responde (lie‑fi): la página no debe quedarse en blanco esperando.
  await context.route('http://localhost:4173/', () => new Promise(() => {}))
  const started = Date.now()
  await page.reload({ timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alojamientos cerca')
  expect(Date.now() - started).toBeLessThan(12_000)
  await context.unrouteAll({ behavior: 'ignoreErrors' })
})
