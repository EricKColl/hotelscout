import { searchLodgings } from '../geo/client'
import type { LodgingSource } from './types'

export const osmSource: LodgingSource = {
  id: 'openstreetmap',
  name: 'OpenStreetMap',
  searchNear: searchLodgings,
}
