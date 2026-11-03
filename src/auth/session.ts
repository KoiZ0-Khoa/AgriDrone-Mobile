import type { LoginResponse, Session, TenantOption, TenantRole } from '../api/types'

export function tenantRole(role: TenantOption['role']): TenantRole | undefined {
  if (role === 0 || role === 'Owner' || role === 'OWNER') return 'OWNER'
  if (role === 1 || role === 'TenantAdmin' || role === 'TENANT_ADMIN') return 'TENANT_ADMIN'
  if (role === 2 || role === 'Member' || role === 'MEMBER') return 'MEMBER'
}

export function toSession(response: LoginResponse): Session | null {
  if (!response.session) return null
  const { tenant, accessToken, expiresAt } = response.session
  if (!tenant) {
    if (!hasManagerRole(accessToken)) throw new Error('Tài khoản System Admin vui lòng sử dụng ứng dụng web.')
    const next: Session = { email: response.email, fullName: response.fullName, phone: response.phone, accessToken, expiresAt, tenant: null, role: 'SYSTEM_MANAGER' }
    if (!isValidSession(next)) throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.')
    return next
  }
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
    && typeof session.expiresAt === 'string' && Date.parse(session.expiresAt) > Date.now()
    && (session.role === 'SYSTEM_MANAGER'
      ? session.tenant === null && hasManagerRole(session.accessToken)
      : typeof session.tenant?.id === 'string' && typeof session.tenant.name === 'string' && ['OWNER', 'TENANT_ADMIN', 'MEMBER'].includes(session.role ?? ''))
}

function hasManagerRole(token: string) {
  try {
    const part = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')
    const payload = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')))
    const roles = Array.isArray(payload.system_role) ? payload.system_role : [payload.system_role]
    return roles.includes('SYSTEM_MANAGER') && !roles.includes('SYSTEM_ADMIN')
  } catch { return false }
}
export const roleLabels: Record<Session['role'], string> = { OWNER: 'Chủ đơn vị', TENANT_ADMIN: 'Quản trị đơn vị', MEMBER: 'Thành viên', SYSTEM_MANAGER: 'System Manager' }
export const canManageFarms = (session: Session | null) => session?.role === 'OWNER' || session?.role === 'TENANT_ADMIN'
