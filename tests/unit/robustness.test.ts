import { buildBookingSearchUrl, buildLinksForLodging } from '../../src/services/links'
import { addDaysISO, validateTrip, type Trip } from '../../src/schemas/search'
import { normalizeLodgings, parseStars } from '../../src/services/geo/normalize'
import { loadFavorites, loadHistory } from '../../src/features/storage'
import { inspectOverpassBody, OVERPASS_LIMIT } from '../../functions/_lib/proxy'

const trip: Trip = { checkIn: '2026-10-10', checkOut: '2026-10-12', adults: 2, childrenAges: [], rooms: 1, radiusMeters: 1000 }
const TODAY = '2026-09-23'

describe('enlace de Booking: entradas extremas (nunca lanza y siempre es válido)', () => {
  const names = [
    'Hotel Simple', "L'Ermitage", 'A & B "Suites" <b>', '  espacios   raros \n\t saltos ', 'パーク ハイアット 東京',
    'برج العرب جميرا', '🏨 Hotel Emoji', 'x'.repeat(5000), 'Hotel; DROP TABLE', '%00%0A%%', '../../etc/passwd', 'https://evil.example.com',
    'Ñandú-Ünïcode', 'Hotel\u0000Nulo', '#hash?query=1&aid=999',
  ]
  const coords: [number, number][] = [[0, 0], [90, 180], [-90, -180], [-34.58, -58.38], [35.68, 139.69], [50.0141985, 8.5804492]]
  for (const name of names) {
    it(`nombre ${JSON.stringify(name.slice(0, 30))}`, () => {
      for (const [latitude, longitude] of coords) {
        const raw = buildBookingSearchUrl({ name, latitude, longitude }, { ...trip, childrenAges: [0, 17] })
        expect(raw).toBeDefined()
        const url = new URL(raw!)
        expect(url.protocol).toBe('https:')
        expect(url.hostname).toBe('www.booking.com')
        expect(url.pathname).toBe('/searchresults.html')
        expect(raw!.length).toBeLessThan(700)
        // Nada del nombre puede colarse como parámetro propio (inyección de aid, etc.)
        expect(url.searchParams.has('aid')).toBe(false)
        expect(url.searchParams.get('checkin')).toBe('2026-10-10')
        expect(url.searchParams.get('dest_type')).toBe('latlong')
        expect(url.searchParams.getAll('age')).toEqual(['0', '17'])
        expect(url.searchParams.get('ss')!.length).toBeLessThanOrEqual(100)
        // eslint-disable-next-line no-control-regex
        expect(url.searchParams.get('ss')).not.toMatch(/[\u0000-\u001f]/)
      }
    })
  }
  it('sin nombre útil (solo espacios/control) no genera enlace', () => {
    expect(buildBookingSearchUrl({ name: '\u0000\n  ', latitude: 1, longitude: 1 }, trip)).toBeUndefined()
  })
  it('buildLinksForLodging nunca falla con web inválida', () => {
    const links = buildLinksForLodging({ name: 'H', latitude: 1, longitude: 1, websiteUrl: 'http://' }, trip)
    expect(links.some((l) => l.kind === 'official_site')).toBe(false)
  })
})

describe('validaciones descubiertas con pruebas reales en Booking', () => {
  it('rechaza más habitaciones que adultos (Booking las recorta en silencio)', () => {
    expect(validateTrip({ ...trip, adults: 1, rooms: 3 }, TODAY).rooms).toMatch(/más habitaciones que adultos/)
    expect(validateTrip({ ...trip, adults: 2, rooms: 2 }, TODAY)).toEqual({})
  })
  it('rechaza fechas a más de ~16 meses (Booking manda a su portada)', () => {
    const limit = addDaysISO(TODAY, 480)
    expect(validateTrip({ ...trip, checkIn: addDaysISO(limit, -2), checkOut: limit }, TODAY)).toEqual({})
    const far = addDaysISO(TODAY, 520)
    expect(validateTrip({ ...trip, checkIn: addDaysISO(far, -2), checkOut: far }, TODAY).checkOut).toMatch(/16 meses/)
  })
})

describe('datos de OpenStreetMap', () => {
  const origin = { latitude: 40.4, longitude: -3.69 }
  it('estrellas: formatos reales de OSM', () => {
    expect(parseStars('4')).toBe(4)
    expect(parseStars('4S')).toBe(4)
    expect(parseStars('3,5')).toBe(3.5)
    expect(parseStars('0')).toBeUndefined()
    expect(parseStars('7')).toBeUndefined()
    expect(parseStars('lujo')).toBeUndefined()
    expect(parseStars(undefined)).toBeUndefined()
  })
  it('el mismo hotel como edificio y como punto (<60 m, mismo nombre) se cuenta una vez', () => {
    const r = normalizeLodgings(
      [
        { type: 'node', id: 1, lat: 40.4, lon: -3.69, tags: { tourism: 'hotel', name: 'Hotel Sol' } },
        { type: 'way', id: 2, center: { lat: 40.4002, lon: -3.69 }, tags: { tourism: 'hotel', name: 'HOTEL SOL' } },
        { type: 'node', id: 3, lat: 40.41, lon: -3.69, tags: { tourism: 'hotel', name: 'Hotel Sol' } },
      ],
      origin,
    )
    expect(r).toHaveLength(2)
  })
})

describe('respuestas de Overpass', () => {
  it('«remark» de tiempo agotado NO es «sin alojamientos»', () => {
    const bad = JSON.stringify({ elements: [], remark: 'runtime error: Query timed out in "query" at line 3 after 21 seconds.' })
    expect(inspectOverpassBody(bad).ok).toBe(false)
    expect(inspectOverpassBody(JSON.stringify({ elements: [], remark: 'runtime error: out of memory' })).ok).toBe(false)
  })
  it('sin «elements» o no JSON → error', () => {
    expect(inspectOverpassBody('<html>').ok).toBe(false)
    expect(inspectOverpassBody('{}').ok).toBe(false)
  })
  it('vacío legítimo se acepta', () => {
    const r = inspectOverpassBody(JSON.stringify({ elements: [] }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(JSON.parse(r.body).truncated).toBe(false)
  })
  it('al llegar al límite se marca como parcial', () => {
    const elements = Array.from({ length: OVERPASS_LIMIT }, (_, i) => ({ type: 'node', id: i }))
    const r = inspectOverpassBody(JSON.stringify({ elements }))
    expect(r.ok && JSON.parse(r.body).truncated).toBe(true)
  })
})

describe('almacenamiento local dañado', () => {
  afterEach(() => localStorage.clear())
  it('JSON roto, tipo equivocado o elementos inválidos no rompen la app', () => {
    localStorage.setItem('hotelscout:favorites:v1', '{no es json')
    localStorage.setItem('hotelscout:history:v1', JSON.stringify({ no: 'es una lista' }))
    expect(loadFavorites()).toEqual([])
    expect(loadHistory()).toEqual([])
    localStorage.setItem('hotelscout:favorites:v1', JSON.stringify([null, 5, 'x', { id: 1 }, { id: 'a', name: 'H', kind: 'hotel', latitude: 1, longitude: 2 }]))
    expect(loadFavorites()).toHaveLength(1)
    localStorage.setItem('hotelscout:history:v1', JSON.stringify([{ placeName: 'X' }, null]))
    expect(loadHistory()).toEqual([])
  })
})
