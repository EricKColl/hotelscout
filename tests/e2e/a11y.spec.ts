import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const ATOCHA = { place_id: 1, osm_type: 'node', osm_id: 5, lat: '40.4070', lon: '-3.6885', display_name: 'Atocha, Madrid, España', name: 'Atocha', category: 'railway', type: 'station', address: { city: 'Madrid' } }
const OVERPASS = { elements: [{ type: 'node', id: 1, lat: 40.4075, lon: -3.689, tags: { tourism: 'hotel', name: 'Hotel Test Uno', stars: '4', website: 'https://example.com' } }] }

test('accesibilidad (axe, WCAG 2.x A/AA) en inicio y resultados', async ({ page }) => {
  await page.route('**/api/geocode*', (r) => r.fulfill({ json: [ATOCHA] }))
  await page.route('**/api/places*', (r) => r.fulfill({ json: OVERPASS }))
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort())
  await page.goto('/')
  const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
  const home = await new AxeBuilder({ page }).withTags(tags).analyze()
  expect(home.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])

  await page.getByLabel('Lugar de referencia').fill('Atocha')
  await page.getByRole('button', { name: 'Buscar lugar' }).click()
  await expect(page.getByText('1 alojamiento(s) localizado(s)')).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(tags).exclude('.leaflet-container').analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([])
})
