import { ApiError, request } from './client'
import type { Assignment, CreateFarm, CreateZone, Farm, PagedResult, TenantUser, Zone } from './types'

const farmPath = (id: string) => `/api/farms/${encodeURIComponent(id)}`
export const getFarms = (token: string, page = 1, signal?: AbortSignal) => request<PagedResult<Farm>>(`/api/farms?pageNumber=${page}&pageSize=20`, { token, signal })
export const getFarm = (token: string, id: string, signal?: AbortSignal) => request<Farm>(farmPath(id), { token, signal })
export const getZones = (token: string, id: string, signal?: AbortSignal) => request<Zone[]>(`${farmPath(id)}/zones`, { token, signal })
export const createFarm = (token: string, body: CreateFarm) => request<{ farmId: string }>('/api/farms', { method: 'POST', token, body })
export const createZone = (token: string, id: string, body: CreateZone) => request<Zone>(`${farmPath(id)}/zones`, { method: 'POST', token, body })

export async function getAdmins(token: string, signal?: AbortSignal) {
  const admins: TenantUser[] = []
  let pageNumber = 1
  let more = true
  while (more) {
    const page = await request<PagedResult<TenantUser>>(`/tenants/current/users?pageNumber=${pageNumber}&pageSize=100`, { token, signal })
    admins.push(...page.items.filter(user => user.role === 1 && user.status === 0))
    more = page.hasNextPage
    pageNumber++
  }
  return admins
}
const assignmentPath = (farmId: string, userId: string) => `${farmPath(farmId)}/members/${encodeURIComponent(userId)}/assignment`
export async function getAssignment(token: string, farmId: string, userId: string, signal?: AbortSignal) {
  try { return await request<Assignment>(assignmentPath(farmId, userId), { token, signal }) }
  catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.code === 'FarmMembership.NotFound') return null
    throw error
  }
}
export const assignManager = (token: string, farmId: string, userId: string, expectedVersion: number | null, reason: string) => request<Assignment>(assignmentPath(farmId, userId), {
  method: 'PUT', token, body: { role: 'MANAGER', accessScope: 'ALL_ZONES', zoneIds: [], expectedVersion, reason: reason.trim() || null },
})
