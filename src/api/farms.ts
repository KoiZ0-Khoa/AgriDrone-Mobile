import { ApiError, request } from './client'
import type { ArchiveRequest, Assignment, AssignFarmMemberRequest, CreateFarm, CreateZone, Farm, FarmDetail, PagedResult, TenantUser, UpdateZoneRequest, UpdateZoneResponse, Zone } from './types'

const farmPath = (id: string) => `/api/farms/${encodeURIComponent(id)}`
export const getFarms = (token: string, page = 1, signal?: AbortSignal) => request<PagedResult<Farm>>(`/api/farms?pageNumber=${page}&pageSize=20`, { token, signal })
export const getFarm = (token: string, id: string, signal?: AbortSignal) => request<FarmDetail>(farmPath(id), { token, signal })
export const getZones = (token: string, id: string, signal?: AbortSignal) => request<Zone[]>(`${farmPath(id)}/zones`, { token, signal })
/** Legacy contract absent from BE 6f172ef; do not call from Mobile screens. */
export const createFarm = (token: string, body: CreateFarm) => request<{ farmId: string }>('/api/farms', { method: 'POST', token, body })
export const createZone = (token: string, id: string, body: CreateZone) => request<Zone>(`${farmPath(id)}/zones`, { method: 'POST', token, body })
export const getZone = (token: string, farmId: string, zoneId: string, signal?: AbortSignal) => request<Zone>(`${farmPath(farmId)}/zones/${encodeURIComponent(zoneId)}`, { token, signal })
export const updateZone = (token: string, farmId: string, zoneId: string, body: UpdateZoneRequest) => request<UpdateZoneResponse>(`${farmPath(farmId)}/zones/${encodeURIComponent(zoneId)}`, { method: 'PUT', token, body })
export const archiveZone = (token: string, farmId: string, zoneId: string, body: ArchiveRequest) => request<void>(`${farmPath(farmId)}/zones/${encodeURIComponent(zoneId)}/archive`, { method: 'PUT', token, body })
export const archiveFarm = (token: string, farmId: string, body: ArchiveRequest) => request<void>(`${farmPath(farmId)}/archive`, { method: 'PUT', token, body })

/** Legacy contract absent from BE 6f172ef; do not call from Mobile screens. */
export async function getAssignableUsers(token: string, actorRole: string, signal?: AbortSignal) {
  const admins: TenantUser[] = []
  let pageNumber = 1
  let more = true
  while (more) {
    const page = await request<PagedResult<TenantUser>>(`/tenants/current/users?pageNumber=${pageNumber}&pageSize=100`, { token, signal })
    admins.push(...page.items.filter(user => user.status === 0 && (user.role === 2 || (actorRole === 'OWNER' && user.role === 1))))
    more = page.hasNextPage
    pageNumber++
  }
  return admins
}
const assignmentPath = (farmId: string, userId: string) => `${farmPath(farmId)}/members/${encodeURIComponent(userId)}/assignment`
/** Legacy contract absent from BE 6f172ef; do not call from Mobile screens. */
export async function getAssignment(token: string, farmId: string, userId: string, signal?: AbortSignal) {
  try { return await request<Assignment>(assignmentPath(farmId, userId), { token, signal }) }
  catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.code === 'FarmMembership.NotFound') return null
    throw error
  }
}
/** Legacy contract absent from BE 6f172ef; do not call from Mobile screens. */
export const assignFarmMember = (token: string, farmId: string, userId: string, body: AssignFarmMemberRequest) => request<Assignment>(assignmentPath(farmId, userId), {
  method: 'PUT', token, body,
})
