import type L from 'leaflet'
import { setWorkerUrl, type StyleSpecification } from 'maplibre-gl'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { toSpanishLabels } from './spanishLabels'

/**
 * Mapa base vectorial de OpenFreeMap (estilo «Liberty») con los nombres en español.
 * OpenFreeMap: gratis, sin registro, sin claves y sin límite de visitas; atribución obligatoria
 * (README de github.com/hyperknot/openfreemap, consultado el 2026-09-24).
 * Se carga aparte (import dinámico) y solo si el navegador tiene WebGL2; si algo falla, ResultsMap usa las teselas de OSM.
 */
export const VECTOR_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

export const VECTOR_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ' +
  '© <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> · ' +
  'Datos © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'

// Márgenes pensados para datos móviles lentos (eSIM de viaje, cobertura débil): si se agotan se usa el mapa de OSM,
// que rotula en el idioma local (en Japón, en japonés), así que conviene no rendirse antes de tiempo.
const STYLE_TIMEOUT_MS = 15_000
/** Tiempo máximo SIN PROGRESO (ninguna tesela, fuente o letra nueva) antes de rendirse. Cada avance lo reinicia. */
const STALL_TIMEOUT_MS = 20_000

// El worker se sirve desde nuestro propio dominio (/assets): lo permite la CSP (`worker-src 'self'`).
setWorkerUrl(workerUrl)

async function fetchStyle(signal: AbortSignal): Promise<StyleSpecification> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  const timer = setTimeout(abort, STYLE_TIMEOUT_MS)
  signal.addEventListener('abort', abort, { once: true })
  try {
    const res = await fetch(VECTOR_STYLE_URL, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`Estilo del mapa: HTTP ${res.status}`)
    const style = (await res.json()) as StyleSpecification
    if (!style || !Array.isArray(style.layers) || typeof style.sources !== 'object') throw new Error('Estilo del mapa no válido')
    return style
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}

/**
 * Añade el mapa base vectorial a `map`. Se resuelve cuando el mapa se ha dibujado.
 * Se rechaza (y retira la capa) si el estilo no llega, si una fuente no carga o si pasa demasiado tiempo sin avanzar
 * (una conexión lenta pero que sigue descargando NO se considera fallo).
 */
export async function addVectorBase(map: L.Map, signal: AbortSignal): Promise<L.Layer> {
  const style = toSpanishLabels(await fetchStyle(signal))
  if (signal.aborted) throw new Error('Mapa cerrado')
  const layer = maplibreGL({ style, attributionControl: { customAttribution: VECTOR_ATTRIBUTION } }).addTo(map)
  const gl = layer.getMaplibreMap()
  if (!gl) {
    map.removeLayer(layer)
    throw new Error('No se pudo crear el mapa vectorial')
  }
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (error?: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      gl.off('data', progress)
      if (error === undefined) return resolve(layer)
      map.removeLayer(layer)
      reject(error)
    }
    const stalled = () => settle(new Error('El mapa vectorial no avanza'))
    let timer = setTimeout(stalled, STALL_TIMEOUT_MS)
    const progress = () => {
      clearTimeout(timer)
      timer = setTimeout(stalled, STALL_TIMEOUT_MS)
    }
    gl.on('data', progress)
    layer.once('remove', () => settle(new Error('Mapa cerrado')))
    gl.once('load', () => settle())
    // Error de una fuente completa (no de una tesela suelta) antes de dibujarse: no va a cargar.
    gl.on('error', (e) => {
      const detail = e as unknown as { sourceId?: string; tile?: unknown; error?: unknown }
      if (detail.sourceId && !detail.tile) settle(detail.error ?? new Error('Fuente del mapa no disponible'))
    })
  })
}
