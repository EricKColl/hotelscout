import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import SearchForm, { type SearchInput } from './components/search/SearchForm'
import LodgingCard from './components/hotels/LodgingCard'
import Notice from './components/common/Notice'
import ErrorBoundary from './components/common/ErrorBoundary'
import { osmSource } from './services/providers/osm'
import { searchPlaces, shouldRetryOnce } from './services/geo/client'
import { rankPlaces } from './services/geo/normalize'
import { GeoError, type Place, type PlaceCategory } from './types/geo'
import { addDaysISO, nightsBetween, todayLocalISO, type Trip } from './schemas/search'
import { applyFilters, DEFAULT_FILTERS, KIND_LABELS, sortLodgings, type Filters, type SortKey } from './features/hotels/filters'
import {
  addHistory,
  clearAllLocalData,
  loadFavorites,
  loadHistory,
  saveFavorites,
  saveHistory,
  toggleFavorite,
  type FavoriteLodging,
  type HistoryEntry,
} from './features/storage'
import { buildOsmMapUrl } from './services/links'
import { formatDistance } from './utils/geo'

const ResultsMap = lazy(() => import('./components/maps/ResultsMap'))

const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  train_station: 'Estación de tren',
  bus_station: 'Estación de autobuses',
  airport: 'Aeropuerto',
  city: 'Ciudad / zona',
  address: 'Dirección',
  other: 'Otro lugar',
}

function describeError(err: unknown): { title: string; detail: string; tone: 'warning' | 'error' } {
  if (err instanceof GeoError) {
    switch (err.code) {
      case 'network':
        return { title: 'Error de conexión', detail: err.message, tone: 'error' }
      case 'rate_limited':
        return { title: 'Límite de solicitudes alcanzado', detail: 'Los servicios gratuitos de mapas limitan las consultas. Espera un minuto y vuelve a intentarlo. Esto no significa que no haya alojamientos.', tone: 'warning' }
      case 'upstream_unavailable':
        return { title: 'Servicio de mapas temporalmente no disponible', detail: 'El servidor público de OpenStreetMap está saturado o no responde. Esto no significa que no haya alojamientos: inténtalo de nuevo en unos minutos o prueba con un radio menor.', tone: 'warning' }
      case 'invalid_response':
        return { title: 'Datos insuficientes', detail: err.message, tone: 'error' }
      case 'invalid_request':
        return { title: 'Consulta no válida', detail: err.message, tone: 'error' }
    }
  }
  return { title: 'Error inesperado', detail: 'Ha ocurrido un problema. Inténtalo de nuevo.', tone: 'error' }
}

function useUpdateReady(): (() => void) | undefined {
  const [apply, setApply] = useState<() => void>()
  useEffect(() => {
    const h = (e: Event) => setApply(() => (e as CustomEvent<() => void>).detail)
    window.addEventListener('hotelscout:update', h)
    return () => window.removeEventListener('hotelscout:update', h)
  }, [])
  return apply
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

// Con datos móviles la conexión se corta a ratos: un único reintento automático a los 2 s (el servidor guarda en caché lo que ya consultó).
const RETRY_DELAY_MS = 2_000

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

export default function App() {
  const online = useOnline()
  const applyUpdate = useUpdateReady()
  const [trip, setTrip] = useState<Trip>()
  const [typeHint, setTypeHint] = useState<PlaceCategory>()
  const [candidates, setCandidates] = useState<Place[]>()
  const [place, setPlace] = useState<Place>()
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortKey>('distance')
  const [selectedId, setSelectedId] = useState<string>()
  const [favorites, setFavorites] = useState<FavoriteLodging[]>(loadFavorites)
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const [formKey, setFormKey] = useState(0)
  const [formInitial, setFormInitial] = useState<Partial<SearchInput>>()
  const [lastQuery, setLastQuery] = useState('')

  const geocode = useMutation({
    mutationFn: (q: string) => searchPlaces(q),
    retry: shouldRetryOnce,
    retryDelay: RETRY_DELAY_MS,
    onSuccess: (list) => {
      const ranked = rankPlaces(list, typeHint)
      setCandidates(ranked)
      setPlace(ranked.length === 1 ? ranked[0] : undefined)
    },
  })

  // Se guarda en el historial solo cuando la búsqueda de alojamientos se completa con éxito.
  function recordHistory(p: Place, t: Trip) {
    setHistory((h) => {
      const next = addHistory(h, {
        placeName: p.displayName,
        city: p.city,
        latitude: p.latitude,
        longitude: p.longitude,
        radiusMeters: t.radiusMeters,
        checkIn: t.checkIn,
        checkOut: t.checkOut,
        adults: t.adults,
        rooms: t.rooms,
        childrenAges: t.childrenAges,
        searchedAt: new Date().toISOString(),
      })
      saveHistory(next)
      return next
    })
  }

  const lodgingsQuery = useQuery({
    queryKey: ['lodgings', place?.id, trip?.radiusMeters],
    queryFn: async ({ signal }) => {
      const result = await osmSource.searchNear(place!, trip!.radiusMeters, signal)
      recordHistory(place!, trip!)
      return result
    },
    enabled: Boolean(place && trip),
    retry: shouldRetryOnce,
    retryDelay: RETRY_DELAY_MS,
    staleTime: 30 * 60_000,
  })

  const lodgings = lodgingsQuery.data?.lodgings
  const visible = useMemo(() => (lodgings ? sortLodgings(applyFilters(lodgings, filters), sort) : []), [lodgings, filters, sort])
  const kindsAvailable = useMemo(() => [...new Set((lodgings ?? []).map((l) => l.kind))], [lodgings])
  const onSelect = useCallback((id: string) => setSelectedId(id), [])

  function handleSearch(input: SearchInput) {
    setTrip(input.trip)
    setTypeHint(input.typeHint)
    setCandidates(undefined)
    setPlace(undefined)
    setFilters(DEFAULT_FILTERS)
    setSelectedId(undefined)
    setLastQuery(input.query)
    geocode.mutate(input.query)
  }

  function reuseHistory(h: HistoryEntry) {
    // Las fechas guardadas pueden haber caducado: en ese caso se proponen unas nuevas.
    const today = todayLocalISO()
    const stale = h.checkIn < today
    const t: Trip = { checkIn: stale ? addDaysISO(today, 7) : h.checkIn, checkOut: stale ? addDaysISO(today, 8) : h.checkOut, adults: h.adults, rooms: h.rooms, childrenAges: h.childrenAges, radiusMeters: h.radiusMeters }
    const p: Place = { id: `hist:${h.latitude},${h.longitude}`, name: h.placeName.split(',')[0] ?? h.placeName, displayName: h.placeName, category: 'other', latitude: h.latitude, longitude: h.longitude, city: h.city }
    setFormInitial({ query: h.placeName.split(',')[0] ?? h.placeName, trip: t })
    setFormKey((k) => k + 1)
    setTrip(t)
    setCandidates([p])
    setPlace(p)
    setFilters(DEFAULT_FILTERS)
    setSelectedId(undefined)
  }

  const favIds = new Set(favorites.map((f) => f.id))
  const onToggleFavorite = (id: string) => {
    const l = lodgings?.find((x) => x.id === id)
    if (!l) return
    setFavorites((list) => {
      const next = toggleFavorite(list, l)
      saveFavorites(next)
      return next
    })
  }

  const geoError = geocode.error ? describeError(geocode.error) : undefined
  const lodgingError = lodgingsQuery.error ? describeError(lodgingsQuery.error) : undefined
  // TanStack Query pausa las peticiones sin conexión y las lanza solas al volver (túneles, metro, cambio Wi‑Fi ↔ datos).
  const geocodePaused = geocode.isPending && geocode.isPaused
  const lodgingsPaused = lodgingsQuery.isPending && lodgingsQuery.fetchStatus === 'paused'
  const canRetryGeocode = geoError && geocode.error instanceof GeoError && geocode.error.code !== 'invalid_request' && geocode.error.code !== 'invalid_response'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#resultados" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-white focus:p-2">
        Saltar a los resultados
      </a>
      <header className="bg-gradient-to-br from-teal-800 to-slate-900 px-4 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-200">HotelScout</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Alojamientos cerca de donde los necesitas</h1>
          <p className="mt-2 max-w-2xl text-teal-50">
            Elige una estación, un aeropuerto o una dirección y localiza los alojamientos que hay alrededor. Después te llevamos a la plataforma para ver precios y disponibilidad.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <Notice title="Cómo funciona y qué no hace">
          HotelScout <strong>localiza</strong> alojamientos con datos de OpenStreetMap. <strong>No compara precios ni comprueba disponibilidad</strong>: los botones «Buscar en Booking.com» abren una búsqueda en esa plataforma, donde debes confirmar precio y condiciones.
        </Notice>

        {applyUpdate && (
          <Notice title="Hay una versión nueva de HotelScout" action={<button type="button" onClick={applyUpdate} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white">Actualizar ahora</button>}>
            Se aplicará al recargar la página.
          </Notice>
        )}

        {!online && (
          <Notice tone="warning" title="Sin conexión">
            Puedes ver tus favoritos e historial guardados en este dispositivo. Si lanzas una búsqueda, se hará sola al recuperar la conexión. Los datos guardados no son disponibilidad actual.
          </Notice>
        )}

        {history.length > 0 && (
          <section aria-labelledby="hist-h">
            <h2 id="hist-h" className="text-lg font-semibold">
              Búsquedas recientes
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {history.map((h) => (
                <li key={`${h.placeName}-${h.radiusMeters}`}>
                  <button type="button" onClick={() => reuseHistory(h)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700">
                    {h.placeName.split(',')[0]} · {formatDistance(h.radiusMeters)}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                setHistory([])
                saveHistory([])
              }}
              className="mt-2 text-sm text-slate-600 underline"
            >
              Borrar historial
            </button>
          </section>
        )}

        <SearchForm key={formKey} busy={geocode.isPending} initial={formInitial} onSubmit={handleSearch} />

        <div id="resultados" tabIndex={-1} className="space-y-4" aria-live="polite">
          {geocodePaused && (
            <Notice tone="warning" title="Esperando conexión…">
              No hay conexión a Internet ahora mismo. La búsqueda del lugar se hará sola en cuanto vuelva (no hace falta pulsar nada).
            </Notice>
          )}
          {geocode.isPending && !geocodePaused && <Notice title="Buscando el lugar…">Consultando OpenStreetMap.</Notice>}
          {geoError && (
            <Notice
              tone={geoError.tone}
              title={geoError.title}
              action={
                <span className="flex gap-2">
                  {canRetryGeocode && lastQuery && (
                    <button type="button" onClick={() => geocode.mutate(lastQuery)} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white">
                      Reintentar
                    </button>
                  )}
                  <button type="button" onClick={() => geocode.reset()} className="rounded-md border border-current px-3 py-1 text-sm">
                    Cerrar
                  </button>
                </span>
              }
            >
              {geoError.detail}
            </Notice>
          )}

          {candidates && candidates.length === 0 && (
            <Notice title="No se encontró ese lugar">
              Prueba con otro nombre, añade la ciudad («Atocha Madrid») o quita palabras como «estación de tren».
            </Notice>
          )}

          {candidates && candidates.length > 1 && !place && (
            <section aria-labelledby="cand-h" className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 id="cand-h" className="text-lg font-semibold">
                Hay varias coincidencias: elige la correcta
              </h2>
              <ul className="mt-2 space-y-2">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setPlace(c)} className="w-full rounded-md border border-slate-300 p-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700">
                      <span className="font-medium">{c.name}</span> <span className="text-xs text-slate-500">({CATEGORY_LABEL[c.category]})</span>
                      <span className="block text-sm text-slate-600">{c.displayName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {place && trip && (
            <section aria-labelledby="res-h" className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 id="res-h" className="text-xl font-semibold">
                  Alojamientos cerca de {place.name}
                </h2>
                <p className="text-sm text-slate-600">{place.displayName}</p>
                <p className="mt-2 text-sm">
                  {fmtDate(trip.checkIn)} → {fmtDate(trip.checkOut)} ({nightsBetween(trip.checkIn, trip.checkOut)} noche(s)) · {trip.adults} adulto(s)
                  {trip.childrenAges.length > 0 ? ` · ${trip.childrenAges.length} niño(s)` : ''} · {trip.rooms} habitación(es) · radio {formatDistance(trip.radiusMeters)} en línea recta
                </p>
                <p className="mt-1 text-sm">
                  <a className="text-teal-800 underline" href={buildOsmMapUrl(place.latitude, place.longitude)} target="_blank" rel="noopener noreferrer">
                    Ver el punto de referencia en el mapa
                  </a>
                </p>
                {lodgingsQuery.isSuccess && (
                  <p className="mt-2 text-sm font-medium">
                    {lodgings!.length} alojamiento(s) localizado(s) · <span className="text-slate-700">0 ofertas verificadas (no hay fuente de precios conectada)</span>
                  </p>
                )}
              </div>

              {lodgingsPaused && (
                <Notice tone="warning" title="Esperando conexión…">
                  No hay conexión a Internet ahora mismo. La búsqueda de alojamientos se hará sola en cuanto vuelva (no hace falta pulsar nada).
                </Notice>
              )}
              {lodgingsQuery.isPending && !lodgingsPaused && <Notice title="Buscando alojamientos…">Puede tardar hasta un minuto si el servidor público de OpenStreetMap está saturado.</Notice>}
              {lodgingError && (
                <Notice tone={lodgingError.tone} title={lodgingError.title} action={<button type="button" onClick={() => lodgingsQuery.refetch()} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white">Reintentar</button>}>
                  {lodgingError.detail}
                </Notice>
              )}

              {lodgingsQuery.isSuccess && lodgingsQuery.data.truncated && (
                <Notice tone="warning" title="Búsqueda parcial">Hay tantos alojamientos que el resultado se ha recortado y pueden faltar algunos, incluso cercanos. Prueba con un radio menor.</Notice>
              )}

              {lodgingsQuery.isSuccess && lodgings!.length === 0 && (
                <Notice title="Sin alojamientos encontrados en OpenStreetMap">
                  No hay alojamientos con nombre registrados en este radio. Eso no significa que no existan: OpenStreetMap puede estar incompleto. Prueba con un radio mayor.
                </Notice>
              )}

              {lodgingsQuery.isSuccess && lodgings!.length > 0 && (
                <>
                  <fieldset className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
                    <legend className="px-1 text-sm font-semibold">Filtros y orden</legend>
                    <div>
                      <span className="block text-sm font-medium">Tipo</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {kindsAvailable.map((k) => (
                          <label key={k} className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={filters.kinds.includes(k)}
                              onChange={(e) => setFilters({ ...filters, kinds: e.target.checked ? [...filters.kinds, k] : filters.kinds.filter((x) => x !== k) })}
                            />
                            {KIND_LABELS[k] ?? k}
                          </label>
                        ))}
                      </div>
                    </div>
                    {lodgings!.some((l) => l.stars) && (
                      <div>
                        <label htmlFor="stars" className="block text-sm font-medium">
                          Estrellas mínimas
                        </label>
                        <select id="stars" value={filters.minStars} onChange={(e) => setFilters({ ...filters, minStars: Number(e.target.value) })} className="mt-1 rounded-md border border-slate-400 px-2 py-1">
                          <option value={0}>Cualquiera</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}★ o más
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={filters.onlyWithWebsite} onChange={(e) => setFilters({ ...filters, onlyWithWebsite: e.target.checked })} />
                      Solo con web propia
                    </label>
                    <div>
                      <label htmlFor="sort" className="block text-sm font-medium">
                        Ordenar por
                      </label>
                      <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="mt-1 rounded-md border border-slate-400 px-2 py-1">
                        <option value="distance">Distancia (menor primero)</option>
                        <option value="name">Nombre (A–Z)</option>
                        <option value="stars">Estrellas (si constan)</option>
                      </select>
                    </div>
                  </fieldset>

                  <ErrorBoundary label="el mapa">
                    <Suspense fallback={<Notice title="Cargando mapa…" />}>
                      <ResultsMap origin={place} radiusMeters={trip.radiusMeters} lodgings={visible} selectedId={selectedId} onSelect={onSelect} />
                    </Suspense>
                  </ErrorBoundary>

                  <p className="text-sm text-slate-600" role="status">
                    Mostrando {visible.length} de {lodgings!.length}. Las distancias son en línea recta, no un recorrido a pie. «Buscar en Booking.com» abre Booking con tus fechas y los alojamientos más cercanos a ese punto: el primero debería ser el elegido; si no está en Booking, verás los de alrededor. Si Booking muestra su portada, vuelve atrás y pulsa otra vez.
                  </p>
                  {visible.length === 0 ? (
                    <Notice title="Ningún alojamiento cumple los filtros">
                      <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="underline">
                        Quitar filtros
                      </button>
                    </Notice>
                  ) : (
                    <ul className="space-y-3">
                      {visible.map((l) => (
                        <LodgingCard
                          key={l.id}
                          lodging={l}
                          trip={trip}
                          city={place.city}
                          selected={selectedId === l.id}
                          favorite={favIds.has(l.id)}
                          onSelect={() => setSelectedId(l.id)}
                          onToggleFavorite={() => onToggleFavorite(l.id)}
                        />
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
          )}
        </div>

        {favorites.length > 0 && (
          <section aria-labelledby="fav-h" className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 id="fav-h" className="text-lg font-semibold">
              Favoritos (guardados en este dispositivo)
            </h2>
            <ul className="mt-2 space-y-2">
              {favorites.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <strong>{f.name}</strong> · {KIND_LABELS[f.kind] ?? f.kind}
                  </span>
                  <span className="flex gap-3">
                    <a className="text-teal-800 underline" href={buildOsmMapUrl(f.latitude, f.longitude)} target="_blank" rel="noopener noreferrer">
                      Ver en mapa
                    </a>
                    <button
                      type="button"
                      className="text-red-700 underline"
                      onClick={() => {
                        const next = favorites.filter((x) => x.id !== f.id)
                        setFavorites(next)
                        saveFavorites(next)
                      }}
                    >
                      Quitar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Los favoritos guardan solo el alojamiento, no precios ni disponibilidad.</p>
          </section>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-sm text-slate-600">
        <p>
          Datos de alojamientos y mapas: © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors (licencia ODbL). Puede haber alojamientos que falten, estén cerrados o tengan datos incorrectos.
        </p>
        <p className="mt-1">
          Privacidad: no hay cuentas ni rastreadores. Favoritos e historial se guardan solo en este navegador.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              clearAllLocalData()
              setFavorites([])
              setHistory([])
            }}
          >
            Borrar todos mis datos locales
          </button>
        </p>
      </footer>
    </div>
  )
}
