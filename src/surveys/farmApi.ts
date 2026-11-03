import { request as apiRequest } from '../api/client'
import type { GeneralStatus, Point as GeoJsonPoint, Polygon as GeoJsonPolygon } from '../api/types'

export type FarmContext = {
  farmId: string; tenantId: string; code: string; name: string; address: string | null; status: GeneralStatus; areaHectares: number | null; version: number
  centerPoint?: GeoJsonPoint | null
  approvedBoundary: { id: string; versionNumber: number; geometry: GeoJsonPolygon | null; source: string; evidenceReference: string | null; reviewedAt: string | null; reviewReason: string | null; version: number } | null
  zones: { id: string; code: string; name: string; status: GeneralStatus; areaHectares: number | null; boundary: GeoJsonPolygon | null; version: number }[]
  publishedBaseMap: { id: string; versionNumber: number; sourceSurveyOrderId: string; publishedAt: string | null; version: number } | null
}
export const getFarmContext = (token: string, farmId: string, signal?: AbortSignal) => apiRequest<FarmContext>(`/api/system-manager/farms/${encodeURIComponent(farmId)}/operational-context`, { token, signal })
