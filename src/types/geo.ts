import { z } from 'zod'

export type PlaceCategory = 'train_station' | 'bus_station' | 'airport' | 'city' | 'address' | 'other'

/** Lugar resuelto por geocodificación (punto de referencia). */
export interface Place {
  id: string
  name: string
  displayName: string
  category: PlaceCategory
  latitude: number
  longitude: number
  country?: string
  city?: string
}

/** Respuesta cruda de Nominatim (jsonv2), validada al recibirla. */
export const nominatimResultSchema = z.object({
  place_id: z.number(),
  osm_type: z.string().optional(),
  osm_id: z.number().optional(),
  lat: z.string(),
  lon: z.string(),
  display_name: z.string(),
  name: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  address: z.record(z.string(), z.string()).optional(),
})
export const nominatimResponseSchema = z.array(nominatimResultSchema)

/** Alojamiento localizado en OpenStreetMap. NO implica disponibilidad ni precio. */
export interface Lodging {
  id: string
  source: 'openstreetmap'
  sourceId: string
  name: string
  kind: string
  latitude: number
  longitude: number
  distanceMeters: number
  stars?: number
  websiteUrl?: string
  phone?: string
  address?: string
}

const osmElementSchema = z.object({
  type: z.enum(['node', 'way', 'relation']),
  id: z.number(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
  tags: z.record(z.string(), z.string()).optional(),
})
export type OsmElement = z.infer<typeof osmElementSchema>
export const overpassResponseSchema = z.object({
  elements: z.array(osmElementSchema),
  remark: z.string().optional(),
  truncated: z.boolean().optional(),
})

/** Códigos de error diferenciados (SPEC §2.2). */
export type GeoErrorCode =
  | 'network'
  | 'rate_limited'
  | 'upstream_unavailable'
  | 'invalid_response'
  | 'invalid_request'

export class GeoError extends Error {
  code: GeoErrorCode
  constructor(code: GeoErrorCode, message: string) {
    super(message)
    this.name = 'GeoError'
    this.code = code
  }
}
