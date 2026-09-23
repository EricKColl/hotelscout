import type { Lodging } from '../../types/geo'
import type { LatLon } from '../../utils/geo'

/**
 * Fuente de alojamientos LOCALIZADOS (geografía). No implica precio ni disponibilidad.
 * Hoy solo existe la de OpenStreetMap.
 */
export interface LodgingSource {
  id: string
  name: string
  searchNear(origin: LatLon, radiusMeters: number, signal?: AbortSignal): Promise<{ lodgings: Lodging[]; truncated: boolean }>
}

/**
 * Contrato del futuro Modo B (precios verificados). NO hay ninguna implementación: Booking, Expedia y
 * Amadeus exigen acuerdo comercial (docs/provider-research.md). Cuando exista una fuente autorizada,
 * se implementará esta interfaz sin tocar la interfaz de usuario. No se debe simular.
 */
export interface VerifiedOffer {
  provider: string
  checkIn: string
  checkOut: string
  currency: string
  totalPrice: number
  taxesIncluded: boolean
  verifiedAt: string
  bookingUrl: string
}

export interface OfferProvider {
  id: string
  getOffers(lodgingIds: string[], stay: { checkIn: string; checkOut: string; adults: number; rooms: number }): Promise<VerifiedOffer[]>
}
