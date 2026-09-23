import { useId, useState, type FormEvent } from 'react'
import { MAX_CHILDREN, RADIUS_OPTIONS, addDaysISO, todayLocalISO, validateQuery, validateTrip, type Trip, type TripErrors } from '../../schemas/search'
import type { PlaceCategory } from '../../types/geo'

export interface SearchInput {
  query: string
  typeHint?: PlaceCategory
  trip: Trip
}

const TYPE_OPTIONS: { value: PlaceCategory | ''; label: string }[] = [
  { value: '', label: 'Cualquier lugar' },
  { value: 'train_station', label: 'Estación de tren' },
  { value: 'bus_station', label: 'Estación de autobuses' },
  { value: 'airport', label: 'Aeropuerto' },
  { value: 'city', label: 'Ciudad o centro urbano' },
  { value: 'address', label: 'Dirección' },
]

interface Props {
  busy: boolean
  initial?: Partial<SearchInput> & { query?: string }
  onSubmit: (input: SearchInput) => void
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

const inputCls =
  'mt-1 w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 aria-[invalid=true]:border-red-600'

export default function SearchForm({ busy, initial, onSubmit }: Props) {
  const uid = useId()
  const today = todayLocalISO()
  const [query, setQuery] = useState(initial?.query ?? '')
  const [typeHint, setTypeHint] = useState<PlaceCategory | ''>(initial?.typeHint ?? '')
  const [checkIn, setCheckIn] = useState(initial?.trip?.checkIn ?? addDaysISO(today, 7))
  const [checkOut, setCheckOut] = useState(initial?.trip?.checkOut ?? addDaysISO(today, 8))
  const [adults, setAdults] = useState(initial?.trip?.adults ?? 2)
  const [rooms, setRooms] = useState(initial?.trip?.rooms ?? 1)
  const [childrenAges, setChildrenAges] = useState<number[]>(initial?.trip?.childrenAges ?? [])
  const [radius, setRadius] = useState<number>(initial?.trip?.radiusMeters ?? 1000)
  const [queryError, setQueryError] = useState<string>()
  const [errors, setErrors] = useState<TripErrors>({})

  function submit(e: FormEvent) {
    e.preventDefault()
    const trip: Trip = { checkIn, checkOut, adults, rooms, childrenAges, radiusMeters: radius }
    const qe = validateQuery(query)
    const te = validateTrip(trip, today)
    setQueryError(qe)
    setErrors(te)
    if (qe || Object.keys(te).length > 0) return
    onSubmit({ query: query.trim(), typeHint: typeHint || undefined, trip })
  }

  const id = (name: string) => `${uid}-${name}`

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Field id={id('q')} label="Lugar de referencia" error={queryError} hint="Ejemplo: «Madrid Atocha», «Aeropuerto de Málaga» o una dirección. La búsqueda se lanza al pulsar el botón.">
            <input
              id={id('q')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-invalid={Boolean(queryError)}
              aria-describedby={queryError ? `${id('q')}-error` : undefined}
              autoComplete="off"
              maxLength={120}
              className={inputCls}
            />
          </Field>
        </div>
        <Field id={id('type')} label="Tipo de lugar" hint="Sirve para ordenar las coincidencias.">
          <select id={id('type')} value={typeHint} onChange={(e) => setTypeHint(e.target.value as PlaceCategory | '')} className={inputCls}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field id={id('in')} label="Entrada" error={errors.checkIn}>
          <input id={id('in')} type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} aria-invalid={Boolean(errors.checkIn)} aria-describedby={errors.checkIn ? `${id('in')}-error` : undefined} className={inputCls} />
        </Field>
        <Field id={id('out')} label="Salida" error={errors.checkOut}>
          <input id={id('out')} type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} aria-invalid={Boolean(errors.checkOut)} aria-describedby={errors.checkOut ? `${id('out')}-error` : undefined} className={inputCls} />
        </Field>
        <Field id={id('ad')} label="Adultos" error={errors.adults}>
          <input id={id('ad')} type="number" inputMode="numeric" min={1} max={30} value={adults} onChange={(e) => setAdults(Number(e.target.value))} aria-invalid={Boolean(errors.adults)} aria-describedby={errors.adults ? `${id('ad')}-error` : undefined} className={inputCls} />
        </Field>
        <Field id={id('rm')} label="Habitaciones" error={errors.rooms}>
          <input id={id('rm')} type="number" inputMode="numeric" min={1} max={9} value={rooms} onChange={(e) => setRooms(Number(e.target.value))} aria-invalid={Boolean(errors.rooms)} aria-describedby={errors.rooms ? `${id('rm')}-error` : undefined} className={inputCls} />
        </Field>
      </div>

      <fieldset className="rounded-md border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium text-slate-800">Niños (opcional)</legend>
        <div className="flex flex-wrap items-center gap-3">
          {childrenAges.map((age, i) => (
            <div key={i} className="flex items-center gap-1">
              <label htmlFor={id(`age${i}`)} className="text-sm">
                Edad del niño {i + 1}
              </label>
              <input
                id={id(`age${i}`)}
                type="number"
                min={0}
                max={17}
                value={age}
                onChange={(e) => setChildrenAges(childrenAges.map((a, j) => (j === i ? Number(e.target.value) : a)))}
                className="w-16 rounded-md border border-slate-400 px-2 py-1"
              />
              <button type="button" onClick={() => setChildrenAges(childrenAges.filter((_, j) => j !== i))} className="text-sm text-red-700 underline" aria-label={`Quitar niño ${i + 1}`}>
                Quitar
              </button>
            </div>
          ))}
          {childrenAges.length < MAX_CHILDREN && (
            <button type="button" onClick={() => setChildrenAges([...childrenAges, 5])} className="rounded-md border border-slate-400 px-3 py-1 text-sm hover:bg-slate-100">
              + Añadir niño
            </button>
          )}
        </div>
        {errors.childrenAges && <p role="alert" className="mt-1 text-sm font-medium text-red-700">{errors.childrenAges}</p>}
        <p className="mt-2 text-xs text-slate-500">Las fechas y los huéspedes solo se usan para preparar el enlace a la plataforma; no se comprueban precios ni disponibilidad.</p>
      </fieldset>

      <div className="flex flex-wrap items-end gap-4">
        <Field id={id('rad')} label="Distancia máxima (en línea recta)" error={errors.radiusMeters}>
          <select id={id('rad')} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className={inputCls}>
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r < 1000 ? `${r} m` : `${r / 1000} km`}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-teal-700 px-6 py-2.5 font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
        >
          {busy ? 'Buscando…' : 'Buscar lugar'}
        </button>
      </div>
    </form>
  )
}
