import { buildBookingSearchUrl, buildLinksForLodging, buildOsmMapUrl, isSafeExternalUrl } from '../../src/services/links'
import { isRealDate, nightsBetween, todayLocalISO, validateQuery, validateTrip, type Trip } from '../../src/schemas/search'
import { applyFilters, DEFAULT_FILTERS, sortLodgings } from '../../src/features/hotels/filters'
import { addHistory, toggleFavorite, type HistoryEntry } from '../../src/features/storage'
import type { Lodging } from '../../src/types/geo'

const trip: Trip = { checkIn: '2026-10-10', checkOut: '2026-10-12', adults: 2, childrenAges: [4, 9], rooms: 1, radiusMeters: 1000 }
const TODAY = '2026-09-23'

describe('enlaces', () => {
  it('Booking: conserva destino, fechas, huéspedes y edades, codificados, sin afiliado', () => {
    const url = new URL(buildBookingSearchUrl('Hotel Ñandú & Spa, Madrid', trip)!)
    expect(url.origin + url.pathname).toBe('https://www.booking.com/searchresults.html')
    expect(url.searchParams.get('ss')).toBe('Hotel Ñandú & Spa, Madrid')
    expect(url.searchParams.get('checkin')).toBe('2026-10-10')
    expect(url.searchParams.get('checkout')).toBe('2026-10-12')
    expect(url.searchParams.get('group_adults')).toBe('2')
    expect(url.searchParams.get('no_rooms')).toBe('1')
    expect(url.searchParams.get('group_children')).toBe('2')
    expect(url.searchParams.getAll('age')).toEqual(['4', '9'])
    expect(url.searchParams.has('aid')).toBe(false)
  })
  it('rechaza destino vacío', () => expect(buildBookingSearchUrl('  ', trip)).toBeUndefined())
  it('valida HTTPS, credenciales y lista blanca', () => {
    expect(isSafeExternalUrl('http://www.booking.com/x')).toBe(false)
    expect(isSafeExternalUrl('https://user:pw@www.booking.com/x')).toBe(false)
    expect(isSafeExternalUrl('https://evil.example.com/x')).toBe(false)
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('https://www.booking.com/x')).toBe(true)
    expect(isSafeExternalUrl('https://hotel-propio.es', { restrictHosts: false })).toBe(true)
  })
  it('enlace de mapa con coordenadas', () => {
    expect(buildOsmMapUrl(40.4065, -3.6895)).toBe('https://www.openstreetmap.org/?mlat=40.406500&mlon=-3.689500#map=18/40.406500/-3.689500')
  })
  it('la búsqueda se etiqueta «Buscar», nunca «Reservar» ni precio', () => {
    const links = buildLinksForLodging({ name: 'H', latitude: 40, longitude: -3, websiteUrl: 'https://h.es' }, trip)
    const search = links.find((l) => l.kind === 'search')!
    expect(search.label).toBe('Buscar en Booking.com')
    expect(links.map((l) => l.label).join(' ')).not.toMatch(/reserv|€|oferta/i)
    expect(links.map((l) => l.kind)).toEqual(['official_site', 'search', 'map'])
  })
  it('sin fechas válidas no se ofrece búsqueda de plataforma', () => {
    expect(buildLinksForLodging({ name: 'H', latitude: 40, longitude: -3 }, undefined).map((l) => l.kind)).toEqual(['map'])
  })
})

describe('validaciones', () => {
  it('acepta un viaje correcto', () => expect(validateTrip(trip, TODAY)).toEqual({}))
  it('rechaza salida <= entrada', () => {
    expect(validateTrip({ ...trip, checkOut: '2026-10-10' }, TODAY).checkOut).toMatch(/posterior/)
    expect(validateTrip({ ...trip, checkOut: '2026-10-09' }, TODAY).checkOut).toBeDefined()
  })
  it('rechaza entrada pasada, permite hoy', () => {
    expect(validateTrip({ ...trip, checkIn: '2026-09-22', checkOut: '2026-09-24' }, TODAY).checkIn).toMatch(/pasado/)
    expect(validateTrip({ ...trip, checkIn: TODAY, checkOut: '2026-09-24' }, TODAY)).toEqual({})
  })
  it('rechaza ocupación, habitaciones, distancia y edades inválidas', () => {
    expect(validateTrip({ ...trip, adults: 0 }, TODAY).adults).toBeDefined()
    expect(validateTrip({ ...trip, rooms: 0 }, TODAY).rooms).toBeDefined()
    expect(validateTrip({ ...trip, radiusMeters: -5 }, TODAY).radiusMeters).toBeDefined()
    expect(validateTrip({ ...trip, adults: 1.5 }, TODAY).adults).toBeDefined()
    expect(validateTrip({ ...trip, childrenAges: [18] }, TODAY).childrenAges).toBeDefined()
  })
  it('rechaza fechas inexistentes y estancias > 30 noches', () => {
    expect(isRealDate('2026-02-31')).toBe(false)
    expect(validateTrip({ ...trip, checkOut: '2026-02-31' }, TODAY).checkOut).toBeDefined()
    expect(validateTrip({ ...trip, checkOut: '2026-12-31' }, TODAY).checkOut).toMatch(/30 noches/)
  })
  it('las fechas son de calendario, sin desfase por zona horaria', () => {
    expect(todayLocalISO(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01')
    expect(todayLocalISO(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
    expect(nightsBetween('2026-03-28', '2026-03-30')).toBe(2) // cambio de hora en Europa
  })
  it('consulta vacía o corta', () => {
    expect(validateQuery('   ')).toBeDefined()
    expect(validateQuery('a')).toBeDefined()
    expect(validateQuery('Atocha')).toBeUndefined()
  })
})

const mk = (id: string, over: Partial<Lodging>): Lodging => ({
  id, source: 'openstreetmap', sourceId: id, name: id, kind: 'hotel', latitude: 0, longitude: 0, distanceMeters: 100, ...over,
})

describe('filtros y ordenación', () => {
  const items = [mk('B', { distanceMeters: 300, stars: 3, websiteUrl: 'https://b.es' }), mk('A', { distanceMeters: 500, kind: 'hostel' }), mk('C', { distanceMeters: 100, stars: 5 })]
  it('filtra por tipo, estrellas y web', () => {
    expect(applyFilters(items, { ...DEFAULT_FILTERS, kinds: ['hostel'] }).map((l) => l.id)).toEqual(['A'])
    expect(applyFilters(items, { ...DEFAULT_FILTERS, minStars: 4 }).map((l) => l.id)).toEqual(['C'])
    expect(applyFilters(items, { ...DEFAULT_FILTERS, onlyWithWebsite: true }).map((l) => l.id)).toEqual(['B'])
  })
  it('ordena por distancia, nombre y estrellas (sin dato al final)', () => {
    expect(sortLodgings(items, 'distance').map((l) => l.id)).toEqual(['C', 'B', 'A'])
    expect(sortLodgings(items, 'name').map((l) => l.id)).toEqual(['A', 'B', 'C'])
    expect(sortLodgings(items, 'stars').map((l) => l.id)).toEqual(['C', 'B', 'A'])
  })
  it('no muta el original', () => {
    const copy = [...items]
    sortLodgings(items, 'name')
    expect(items).toEqual(copy)
  })
})

describe('favoritos e historial', () => {
  it('alterna favoritos sin guardar precios', () => {
    const l = mk('x', { name: 'Hotel X' })
    const a = toggleFavorite([], l, new Date('2026-09-23T10:00:00Z'))
    expect(a).toHaveLength(1)
    expect(Object.keys(a[0]!)).not.toContain('price')
    expect(toggleFavorite(a, l)).toHaveLength(0)
  })
  it('historial: sin duplicados y máximo 10', () => {
    const e = (n: number): HistoryEntry => ({ placeName: `L${n}`, latitude: 0, longitude: 0, radiusMeters: 1000, checkIn: '', checkOut: '', adults: 1, rooms: 1, childrenAges: [], searchedAt: '' })
    let h: HistoryEntry[] = []
    for (let i = 0; i < 15; i++) h = addHistory(h, e(i))
    expect(h).toHaveLength(10)
    h = addHistory(h, e(14))
    expect(h.filter((x) => x.placeName === 'L14')).toHaveLength(1)
    expect(h[0]!.placeName).toBe('L14')
  })
})
