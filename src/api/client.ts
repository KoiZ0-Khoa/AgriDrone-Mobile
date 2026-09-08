import { Platform } from 'react-native'

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:5080' : 'http://localhost:5080')).replace(/\/$/, '')
let unauthorizedHandler: ((token: string) => void) | undefined
export function onUnauthorized(handler?: (token: string) => void) { unauthorizedHandler = handler }

export async function checkHealth(signal?: AbortSignal) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) abort()
  signal?.addEventListener('abort', abort)
  const timeout = setTimeout(abort, 10_000)
  try {
    const response = await fetch(`${API_URL}/health/live`, { signal: controller.signal })
    if (!response.ok) throw new Error('Không kết nối được máy chủ.')
    return true
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); this.name = 'ApiError' }
}

export async function request<T>(path: string, options: { method?: string; body?: unknown; token?: string; signal?: AbortSignal } = {}): Promise<T> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (options.signal?.aborted) abort()
  options.signal?.addEventListener('abort', abort)
  const timeout = setTimeout(abort, 20_000)
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET', signal: controller.signal,
      headers: { Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    if (!response.ok) {
      const problem = await response.json().catch(() => ({})) as { detail?: string; title?: string; errorCode?: string; errors?: Record<string, string[]> }
      if (response.status === 401 && options.token) unauthorizedHandler?.(options.token)
      const validation = problem.errors ? Object.values(problem.errors).flat()[0] : undefined
      throw new ApiError(response.status, validation ?? problem.detail ?? problem.title ?? 'Không thể xử lý yêu cầu.', problem.errorCode)
    }
    if (response.status === 204) return undefined as T
    return await response.json() as T
  } catch (error) {
    if (error instanceof ApiError || options.signal?.aborted) throw error
    throw new Error('Không kết nối được máy chủ. Kiểm tra kết nối mạng và thử lại.')
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abort)
  }
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn hoặc thông tin đăng nhập chưa đúng.'
    if (error.status === 403) return 'Bạn chưa có quyền thực hiện thao tác này trong phạm vi được chọn.'
    if (error.status === 404) return 'Không tìm thấy dữ liệu trong phạm vi hiện tại.'
    if (error.code === 'FarmMembership.TargetTenantMembershipInactive') return 'Quản trị viên này đã ngừng hoạt động. Vui lòng chọn người khác.'
    if (error.code === 'FarmMembership.TargetMustBeTenantAdmin') return 'Người được chọn phải là quản trị viên đơn vị đang hoạt động.'
    if (error.status === 409) return 'Dữ liệu bị trùng hoặc đã thay đổi. Vui lòng tải lại trước khi thử tiếp.'
  }
  return error instanceof Error ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.'
}
