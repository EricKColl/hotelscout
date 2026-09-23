import { z } from 'zod'

export const RADIUS_OPTIONS = [300, 500, 800, 1000, 1500, 2000, 3000, 5000] as const
export const MAX_CHILDREN = 6

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida.')

/** Fecha de calendario local (no UTC) en formato YYYY-MM-DD. */
export function todayLocalISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Comprueba que la fecha existe en el calendario (rechaza 2026-02-31). */
export function isRealDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = checkIn.split('-').map(Number)
  const [y2, m2, d2] = checkOut.split('-').map(Number)
  return Math.round((Date.UTC(y2!, m2! - 1, d2!) - Date.UTC(y1!, m1! - 1, d1!)) / 86_400_000)
}

export const tripSchema = z.object({
  checkIn: isoDate,
  checkOut: isoDate,
  adults: z.number().int('Indica un número entero de adultos.').min(1, 'Debe haber al menos 1 adulto.').max(30, 'Máximo 30 adultos.'),
  childrenAges: z.array(z.number().int().min(0, 'Edad no válida.').max(17, 'La edad máxima de un niño es 17.')).max(MAX_CHILDREN),
  rooms: z.number().int('Indica un número entero de habitaciones.').min(1, 'Debe haber al menos 1 habitación.').max(9, 'Máximo 9 habitaciones.'),
  radiusMeters: z.number().refine((n) => n > 0, 'La distancia debe ser positiva.').refine((n) => n <= 5000, 'La distancia máxima es 5 km.'),
})
export type Trip = z.infer<typeof tripSchema>

export type TripErrors = Partial<Record<'checkIn' | 'checkOut' | 'adults' | 'rooms' | 'childrenAges' | 'radiusMeters', string>>

export function validateTrip(trip: Trip, today: string = todayLocalISO()): TripErrors {
  const errors: TripErrors = {}
  const parsed = tripSchema.safeParse(trip)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof TripErrors
      if (key && !errors[key]) errors[key] = issue.message
    }
  }
  if (!errors.checkIn && !isRealDate(trip.checkIn)) errors.checkIn = 'La fecha de entrada no existe.'
  if (!errors.checkOut && !isRealDate(trip.checkOut)) errors.checkOut = 'La fecha de salida no existe.'
  if (!errors.checkIn && trip.checkIn < today) errors.checkIn = 'La fecha de entrada no puede estar en el pasado.'
  if (!errors.checkIn && !errors.checkOut && trip.checkOut <= trip.checkIn) {
    errors.checkOut = 'La salida debe ser posterior a la entrada.'
  }
  if (!errors.checkIn && !errors.checkOut && nightsBetween(trip.checkIn, trip.checkOut) > 30) {
    errors.checkOut = 'La estancia máxima es de 30 noches.'
  }
  return errors
}

export function validateQuery(query: string): string | undefined {
  const q = query.trim()
  if (q.length === 0) return 'Escribe un lugar (por ejemplo, «Madrid Atocha»).'
  if (q.length < 2) return 'Escribe al menos 2 caracteres.'
  if (q.length > 120) return 'La búsqueda es demasiado larga.'
  return undefined
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10)
}
