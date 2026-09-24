import { spanishLabel, toSpanishLabels } from '../../src/components/maps/spanishLabels'
import { normalizeLodgings, readableName } from '../../src/services/geo/normalize'

// Expresiones reales del estilo «Liberty» de OpenFreeMap (github.com/hyperknot/openfreemap-styles, 2026-09-24).
const LIBERTY_LINE_LABEL = ['case', ['has', 'name:nonlatin'], ['concat', ['get', 'name:latin'], ' ', ['get', 'name:nonlatin']], ['coalesce', ['get', 'name_en'], ['get', 'name']]]
const LIBERTY_POINT_LABEL = ['case', ['has', 'name:nonlatin'], ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']], ['coalesce', ['get', 'name_en'], ['get', 'name']]]
const SHIELD = ['to-string', ['get', 'ref']]

const style = {
  version: 8,
  sources: {},
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#f8f4f0' } },
    { id: 'highway-name-major', type: 'symbol', layout: { 'text-field': LIBERTY_LINE_LABEL, 'text-font': ['Noto Sans Regular'] } },
    { id: 'label_city', type: 'symbol', layout: { 'text-field': LIBERTY_POINT_LABEL } },
    { id: 'road_shield', type: 'symbol', layout: { 'text-field': SHIELD } },
    { id: 'housenumber', type: 'symbol', layout: { 'text-field': '{housenumber}' } },
    { id: 'legacy', type: 'symbol', layout: { 'text-field': '{name_en}' } },
    { id: 'road_one_way_arrow', type: 'symbol', layout: { 'icon-image': 'arrow' } },
  ],
}

describe('mapa en español', () => {
  it('las etiquetas con nombres pasan a español → alfabeto latino → nombre local', () => {
    const out = toSpanishLabels(style)
    const field = (id: string) => out.layers.find((l) => l.id === id)?.layout?.['text-field']
    expect(spanishLabel()).toEqual(['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name']])
    expect(field('highway-name-major')).toEqual(spanishLabel())
    expect(field('label_city')).toEqual(spanishLabel())
    expect(field('legacy')).toEqual(spanishLabel())
  })

  it('no toca números de carretera, portales, iconos ni capas que no son de texto', () => {
    const out = toSpanishLabels(style)
    expect(out.layers.find((l) => l.id === 'road_shield')?.layout?.['text-field']).toEqual(SHIELD)
    expect(out.layers.find((l) => l.id === 'housenumber')?.layout?.['text-field']).toBe('{housenumber}')
    expect(out.layers.find((l) => l.id === 'road_one_way_arrow')).toBe(style.layers[6])
    expect(out.layers[0]).toBe(style.layers[0])
  })

  it('no modifica el estilo original y conserva el resto de propiedades', () => {
    const before = JSON.stringify(style)
    const out = toSpanishLabels(style)
    expect(JSON.stringify(style)).toBe(before)
    expect(out.layers[1]?.layout?.['text-font']).toEqual(['Noto Sans Regular'])
    expect(out.version).toBe(8)
  })
})

describe('nombres de alojamientos legibles', () => {
  it('nombre en japonés con traducción en OSM: se muestra la traducción y se guarda el original', () => {
    expect(readableName('ホテル東京', { 'name:en': 'Hotel Tokyo' })).toEqual({ name: 'Hotel Tokyo', localName: 'ホテル東京' })
    expect(readableName('ホテル東京', { 'name:en': 'Hotel Tokyo', 'name:es': 'Hotel Tokio' })).toEqual({ name: 'Hotel Tokio', localName: 'ホテル東京' })
    expect(readableName('Гостиница Москва', { int_name: 'Gostinitsa Moskva' }).name).toBe('Gostinitsa Moskva')
  })

  it('sin traducción en OSM se deja el original (no se inventa ni se transcribe)', () => {
    expect(readableName('北京饭店', {})).toEqual({ name: '北京饭店' })
    expect(readableName('北京饭店', { 'name:en': '北京饭店' })).toEqual({ name: '北京饭店' })
  })

  it('los nombres en alfabeto latino no se traducen (son nombres propios)', () => {
    expect(readableName('Hôtel de la Gare', { 'name:es': 'Hotel de la Estación' })).toEqual({ name: 'Hôtel de la Gare' })
    expect(readableName('Hotel Ærø 2', { 'name:en': 'Hotel Aero' })).toEqual({ name: 'Hotel Ærø 2' })
  })

  it('en la lista sale el nombre traducido y los duplicados se detectan por el nombre original', () => {
    const r = normalizeLodgings(
      [
        { type: 'node', id: 1, lat: 35.68, lon: 139.76, tags: { tourism: 'hotel', name: 'ホテル東京', 'name:en': 'Hotel Tokyo' } },
        { type: 'way', id: 2, center: { lat: 35.6802, lon: 139.76 }, tags: { tourism: 'hotel', name: 'ホテル東京' } },
      ],
      { latitude: 35.68, longitude: 139.76 },
    )
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ name: 'Hotel Tokyo', localName: 'ホテル東京' })
  })
})
