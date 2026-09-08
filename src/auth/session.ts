import type { LoginResponse, Session, TenantOption, TenantRole } from '../api/types'

export function tenantRole(role: TenantOption['role']): TenantRole | undefined {
  if (role === 0 || role === 'Owner' || role === 'OWNER') return 'OWNER'
  if (role === 1 || role === 'TenantAdmin' || role === 'TENANT_ADMIN') return 'TENANT_ADMIN'
  if (role === 2 || role === 'Member' || role === 'MEMBER') return 'MEMBER'
}

export function toSession(response: LoginResponse): Session | null {
  if (!response.session) return null
  const { tenant, accessToken, expiresAt } = response.session
  if (!tenant) throw new Error('Tài khoản quản trị hệ thống vui lòng sử dụng ứng dụng web. Mobile cần tài khoản thuộc một đơn vị.')
  const role = tenantRole(tenant.role)
  if (!role || !accessToken || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) {
    throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.')
  }
  return { email: response.email, fullName: response.fullName, phone: response.phone, accessToken, expiresAt, tenant: { id: tenant.id, name: tenant.name, code: tenant.code }, role }
}

export function isValidSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<Session>
  return typeof session.accessToken === 'string' && session.accessToken.length > 0
    && typeof session.fullName === 'string' && typeof session.email === 'string'
    && typeof session.tenant?.id === 'string' && typeof session.tenant.name === 'string'
    && typeof session.expiresAt === 'string' && Date.parse(session.expiresAt) > Date.now()
    && ['OWNER', 'TENANT_ADMIN', 'MEMBER'].includes(session.role ?? '')
}

export const roleLabels: Record<TenantRole, string> = { OWNER: 'Chủ đơn vị', TENANT_ADMIN: 'Quản trị đơn vị', MEMBER: 'Thành viên' }
export const canManageFarms = (session: Session | null) => session?.role === 'OWNER' || session?.role === 'TENANT_ADMIN'
