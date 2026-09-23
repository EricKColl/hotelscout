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
