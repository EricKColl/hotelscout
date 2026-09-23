import type { Lodging } from '../../types/geo'

export type SortKey = 'distance' | 'name' | 'stars'

export interface Filters {
  kinds: string[]
  minStars: number
  onlyWithWebsite: boolean
}

export const DEFAULT_FILTERS: Filters = { kinds: [], minStars: 0, onlyWithWebsite: false }

export const KIND_LABELS: Record<string, string> = {
  hotel: 'Hotel',
  hostel: 'Albergue / hostal',
  guest_house: 'Casa de huéspedes',
  motel: 'Motel',
  apartment: 'Apartamento',
  chalet: 'Chalet',
}

export function applyFilters(items: Lodging[], f: Filters): Lodging[] {
  return items.filter((l) => {
    if (f.kinds.length > 0 && !f.kinds.includes(l.kind)) return false
    if (f.minStars > 0 && (l.stars ?? 0) < f.minStars) return false
    if (f.onlyWithWebsite && !l.websiteUrl) return false
    return true
  })
}

export function sortLodgings(items: Lodging[], key: SortKey): Lodging[] {
  const copy = [...items]
  if (key === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  if (key === 'stars') {
    // Los que no tienen dato de estrellas van al final: no se les inventa una categoría.
    return copy.sort((a, b) => (b.stars ?? -1) - (a.stars ?? -1) || a.distanceMeters - b.distanceMeters)
  }
  return copy.sort((a, b) => a.distanceMeters - b.distanceMeters)
}
