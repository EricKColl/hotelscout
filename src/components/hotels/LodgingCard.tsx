import type { Lodging } from '../../types/geo'
import type { Trip } from '../../schemas/search'
import { buildLinksForLodging } from '../../services/links'
import { KIND_LABELS } from '../../features/hotels/filters'
import { formatDistance } from '../../utils/geo'

interface Props {
  lodging: Lodging
  trip?: Trip
  city?: string
  selected: boolean
  favorite: boolean
  onSelect: () => void
  onToggleFavorite: () => void
}

const linkStyle: Record<string, string> = {
  search: 'bg-teal-700 text-white hover:bg-teal-800',
  official_site: 'border border-slate-400 text-slate-800 hover:bg-slate-100',
  map: 'border border-slate-400 text-slate-800 hover:bg-slate-100',
}

export default function LodgingCard({ lodging, trip, city, selected, favorite, onSelect, onToggleFavorite }: Props) {
  const links = buildLinksForLodging({ ...lodging, city }, trip)
  return (
    <li
      className={`rounded-xl border bg-white p-4 shadow-sm ${selected ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            <button type="button" onClick={onSelect} className="text-left underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700">
              {lodging.name}
            </button>
          </h3>
          <p className="text-sm text-slate-600">
            {KIND_LABELS[lodging.kind] ?? lodging.kind}
            {lodging.stars ? ` · ${lodging.stars}★ (dato de OpenStreetMap)` : ''}
          </p>
          {lodging.address && <p className="text-sm text-slate-600">{lodging.address}</p>}
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? `Quitar ${lodging.name} de favoritos` : `Guardar ${lodging.name} en favoritos`}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700"
        >
          {favorite ? '★ Guardado' : '☆ Guardar'}
        </button>
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div>
          <dt className="inline text-slate-500">Distancia en línea recta: </dt>
          <dd className="inline font-medium">{formatDistance(lodging.distanceMeters)}</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">Precio: </dt>
          <dd className="inline font-medium">Consultar precio</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">Fuente: </dt>
          <dd className="inline">OpenStreetMap (disponibilidad no verificada)</dd>
        </div>
      </dl>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.kind}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.note}
              className={`inline-block rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${linkStyle[link.kind]}`}
            >
              {link.label}
              <span className="sr-only"> (se abre en una pestaña nueva). {link.note}</span>
            </a>
          </li>
        ))}
      </ul>
    </li>
  )
}
