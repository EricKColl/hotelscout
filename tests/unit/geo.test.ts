import { formatDistance, haversineMeters, isValidCoordinate } from '../../src/utils/geo'
import { normalizeLodgings, normalizePlaces } from '../../src/services/geo/normalize'

describe('haversineMeters', () => {
  it('París–Londres ≈ 343,5 km', () => {
    const d = haversineMeters({ latitude: 48.8566, longitude: 2.3522 }, { latitude: 51.5074, longitude: -0.1278 })
    expect(d / 1000).toBeGreaterThan(342)
    expect(d / 1000).toBeLessThan(345)
  })
  it('distancia cero al mismo punto', () => {
    const p = { latitude: 40.4, longitude: -3.7 }
    expect(haversineMeters(p, p)).toBe(0)
  })
  it('Puerta del Sol – Atocha ≈ 1,7 km en línea recta', () => {
    const d = haversineMeters({ latitude: 40.4169, longitude: -3.7035 }, { latitude: 40.4065, longitude: -3.6895 })
    expect(d).toBeGreaterThan(1500)
    expect(d).toBeLessThan(1900)
  })
})

describe('utilidades', () => {
  it('valida coordenadas', () => {
    expect(isValidCoordinate(91, 0)).toBe(false)
    expect(isValidCoordinate(0, 181)).toBe(false)
    expect(isValidCoordinate(NaN, 0)).toBe(false)
    expect(isValidCoordinate(40, -3)).toBe(true)
  })
  it('formatea distancias', () => {
    expect(formatDistance(347)).toBe('350 m')
    expect(formatDistance(1234)).toBe('1,2 km')
  })
})

describe('normalizePlaces', () => {
  it('clasifica estaciones y descarta coordenadas inválidas', () => {
    const places = normalizePlaces([
      { place_id: 1, osm_type: 'node', osm_id: 10, lat: '40.4', lon: '-3.69', display_name: 'Madrid Atocha, Madrid, España', category: 'railway', type: 'station', address: { city: 'Madrid', country: 'España' } },
      { place_id: 2, lat: 'abc', lon: '0', display_name: 'Roto' },
    ])
    expect(places).toHaveLength(1)
    expect(places[0]).toMatchObject({ name: 'Madrid Atocha', category: 'train_station', city: 'Madrid' })
  })
  it('clasifica aeropuertos y estaciones de autobuses', () => {
    const [a, b] = normalizePlaces([
      { place_id: 3, lat: '40', lon: '-3', display_name: 'Barajas', category: 'aeroway', type: 'aerodrome' },
      { place_id: 4, lat: '41', lon: '2', display_name: 'Nord', category: 'amenity', type: 'bus_station' },
    ])
    expect(a?.category).toBe('airport')
    expect(b?.category).toBe('bus_station')
  })
})

describe('normalizeLodgings', () => {
  const origin = { latitude: 40.4, longitude: -3.69 }
  it('calcula distancias, ordena y descarta elementos sin nombre o sin coordenadas', () => {
    const result = normalizeLodgings(
      [
        { type: 'node', id: 1, lat: 40.41, lon: -3.69, tags: { tourism: 'hotel', name: 'Lejos', stars: '4', website: 'ejemplo.com/hotel' } },
        { type: 'way', id: 2, center: { lat: 40.401, lon: -3.69 }, tags: { tourism: 'hostel', name: 'Cerca' } },
        { type: 'node', id: 3, lat: 40.4, lon: -3.69, tags: { tourism: 'hotel' } },
        { type: 'relation', id: 4, tags: { tourism: 'hotel', name: 'Sin coordenadas' } },
        { type: 'node', id: 5, lat: 40.4, lon: -3.69, tags: { tourism: 'museum', name: 'Museo' } },
      ],
      origin,
    )
    expect(result.map((l) => l.name)).toEqual(['Cerca', 'Lejos'])
    expect(result[1]?.stars).toBe(4)
    expect(result[1]?.websiteUrl).toBe('https://ejemplo.com/hotel')
    expect(result[0]?.distanceMeters).toBeGreaterThan(100)
  })
  it('descarta webs peligrosas o con credenciales', () => {
    const [h] = normalizeLodgings(
      [{ type: 'node', id: 9, lat: 40.4, lon: -3.69, tags: { tourism: 'hotel', name: 'X', website: 'javascript:alert(1)' } }],
      origin,
    )
    expect(h?.websiteUrl).toBeUndefined()
    const [g] = normalizeLodgings(
      [{ type: 'node', id: 10, lat: 40.4, lon: -3.69, tags: { tourism: 'hotel', name: 'Y', website: 'https://user:pw@x.com' } }],
      origin,
    )
    expect(g?.websiteUrl).toBeUndefined()
  })
  it('elimina duplicados por id de OSM', () => {
    const el = { type: 'node' as const, id: 1, lat: 40.4, lon: -3.69, tags: { tourism: 'hotel', name: 'A' } }
    expect(normalizeLodgings([el, el], origin)).toHaveLength(1)
  })
})

import { rankPlaces } from '../../src/services/geo/normalize'

describe('rankPlaces / categorías reales de Nominatim', () => {
  it('reconoce railway/stop y building/train_station como estación', () => {
    const r = normalizePlaces([
      { place_id: 1, lat: '40', lon: '-3', display_name: 'Atocha', category: 'railway', type: 'stop' },
      { place_id: 2, lat: '40', lon: '-3', display_name: 'Atocha-Cercanías', category: 'building', type: 'train_station' },
    ])
    expect(r.map((p) => p.category)).toEqual(['train_station', 'train_station'])
  })
  it('prioriza el tipo elegido sin descartar el resto', () => {
    const r = normalizePlaces([
      { place_id: 1, lat: '40', lon: '-3', display_name: 'Barrio', category: 'boundary', type: 'administrative' },
      { place_id: 2, lat: '40', lon: '-3', display_name: 'Estación', category: 'railway', type: 'station' },
    ])
    const ranked = rankPlaces(r, 'train_station')
    expect(ranked[0]?.name).toBe('Estación')
    expect(ranked).toHaveLength(2)
  })
})
