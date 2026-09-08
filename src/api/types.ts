export type TenantRole = 'OWNER' | 'TENANT_ADMIN' | 'MEMBER'
export type Tenant = { id: string; code: string; name: string }
export type TenantOption = Tenant & { role: TenantRole | 'Owner' | 'TenantAdmin' | 'Member' | 0 | 1 | 2 }
export type Session = { email: string; fullName: string; phone: string | null; accessToken: string; expiresAt: string; tenant: Tenant; role: TenantRole }
export type TenantSelection = { selectionToken: string; expiresAt: string; tenants: TenantOption[] }
export type LoginResponse = {
  email: string; fullName: string; phone: string | null
  session: { accessToken: string; expiresAt: string; tenant: TenantOption | null } | null
  tenantSelection: TenantSelection | null
}
export type GeneralStatus = 0 | 1 | 'Active' | 'Inactive'
export type PagedResult<T> = { items: T[]; pageNumber: number; pageSize: number; totalCount: number; hasNextPage: boolean }
export type Point = { type: 'Point'; coordinates: [number, number] }
export type Polygon = { type: 'Polygon'; coordinates: number[][][] }
export type Farm = {
  id: string; tenantId: string; code: string; name: string; address: string | null
  areaHectares: number | null; centerPoint: Point | null; boundary: Polygon | null
  status: GeneralStatus; createdAt: string
}
export type Zone = { zoneId: string; farmId: string; code: string; name: string; areaHectares: number | null; boundary: Polygon | null; status: GeneralStatus; version: number; createdAt: string }
export type CreateFarm = { code: string; name: string; address: string | null; areaHectares: number | null; centerPoint: Point | null; boundary: null }
export type CreateZone = { code: string; name: string; areaHectares: number | null; boundary: null }
export type TenantUser = { id: string; fullName: string; email: string; role: 0 | 1 | 2; status: 0 | 1 | 2 }
export type Assignment = { farmMembershipId: string; farmId: string; userId: string; role: 'MANAGER' | 'WORKER'; accessScope: 'ALL_ZONES' | 'SELECTED_ZONES'; zoneIds: string[]; status: 'ACTIVE' | 'INACTIVE'; version: number }
