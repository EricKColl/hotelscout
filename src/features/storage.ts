import type { Lodging } from '../types/geo'

/** Acceso seguro a localStorage: si no está disponible (modo privado, bloqueado), la app sigue funcionando. */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* sin almacenamiento: se ignora */
  }
}

const FAV_KEY = 'hotelscout:favorites:v1'
const HIST_KEY = 'hotelscout:history:v1'
const MAX_HISTORY = 10

export type FavoriteLodging = Pick<Lodging, 'id' | 'name' | 'kind' | 'latitude' | 'longitude' | 'websiteUrl' | 'address'> & { savedAt: string }

export interface HistoryEntry {
  placeName: string
  city?: string
  latitude: number
  longitude: number
  radiusMeters: number
  checkIn: string
  checkOut: string
  adults: number
  rooms: number
  childrenAges: number[]
  searchedAt: string
}

export const loadFavorites = (): FavoriteLodging[] => read<FavoriteLodging[]>(FAV_KEY, [])
export const saveFavorites = (list: FavoriteLodging[]) => write(FAV_KEY, list)

export function toggleFavorite(list: FavoriteLodging[], l: Lodging, now = new Date()): FavoriteLodging[] {
  if (list.some((f) => f.id === l.id)) return list.filter((f) => f.id !== l.id)
  return [
    ...list,
    { id: l.id, name: l.name, kind: l.kind, latitude: l.latitude, longitude: l.longitude, websiteUrl: l.websiteUrl, address: l.address, savedAt: now.toISOString() },
  ]
}

export const loadHistory = (): HistoryEntry[] => read<HistoryEntry[]>(HIST_KEY, [])
export function addHistory(list: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const withoutDup = list.filter((h) => !(h.placeName === entry.placeName && h.radiusMeters === entry.radiusMeters))
  return [entry, ...withoutDup].slice(0, MAX_HISTORY)
}
export const saveHistory = (list: HistoryEntry[]) => write(HIST_KEY, list)

export function clearAllLocalData(): void {
  try {
    localStorage.removeItem(FAV_KEY)
    localStorage.removeItem(HIST_KEY)
  } catch {
    /* ignorado */
  }
}
