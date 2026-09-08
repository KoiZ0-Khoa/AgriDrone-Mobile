import type { Farm } from '../api/types'

export type Coordinate = { latitude: number; longitude: number }
export function farmCoordinate(farm: Pick<Farm, 'centerPoint'>): Coordinate | null {
  const point = farm.centerPoint
  if (point?.type !== 'Point' || !Array.isArray(point.coordinates)) return null
  const [longitude, latitude] = point.coordinates
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) return null
  return { latitude, longitude }
}
export type FarmMapProps = { farms: Farm[]; selectedId?: string; onSelect?: (farm: Farm) => void; interactive?: boolean }
