/**
 * Comprobación REAL contra Nominatim y Overpass a través del proxy local.
 * No forma parte de `npm test` (usa la red y cuotas públicas). Ejecutar con:
 *   1) npm run dev -- --port 5199     2) npm run test:live
 */
import { searchLodgings, searchPlaces } from '../../src/services/geo/client'

const BASE = 'http://localhost:5199'
const realFetch = globalThis.fetch

beforeAll(() => {
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    realFetch(typeof input === 'string' && input.startsWith('/') ? BASE + input : input, init)) as typeof fetch
})
afterAll(() => {
  globalThis.fetch = realFetch
})

describe('geografía real (proxy local)', () => {
  it('resuelve la estación de Atocha y encuentra hoteles reales cerca', async () => {
    const places = await searchPlaces('Madrid Atocha')
    expect(places.length).toBeGreaterThan(0)
    const station = places.find((p) => p.category === 'train_station') ?? places[0]!
    console.log('Lugar:', station.displayName, station.latitude, station.longitude)
    expect(Math.abs(station.latitude - 40.406)).toBeLessThan(0.02)

    const { lodgings, truncated } = await searchLodgings(station, 800)
    console.log('Alojamientos:', lodgings.length, 'truncado:', truncated)
    console.log(lodgings.slice(0, 5).map((l) => `${l.name} (${l.kind}) ${Math.round(l.distanceMeters)} m`))
    expect(lodgings.length).toBeGreaterThan(0)
    expect(lodgings.every((l) => l.distanceMeters <= 800)).toBe(true)
  }, 120_000)
})
