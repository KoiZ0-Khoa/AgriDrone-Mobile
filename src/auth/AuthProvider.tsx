import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react'
import { AppState } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { onUnauthorized, request } from '../api/client'
import type { LoginResponse, Session, TenantSelection } from '../api/types'
import { isValidSession, toSession } from './session'
import { sessionStorage } from './storage'

type Auth = {
  session: Session | null; selection: TenantSelection | null; ready: boolean
  login: (email: string, password: string) => Promise<void>
  selectTenant: (tenantId: string) => Promise<void>
  cancelSelection: () => void; logout: () => Promise<void>
  updateProfile: (profile: { fullName: string; phone: string | null }) => Promise<void>
}
const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [selection, setSelection] = useState<TenantSelection | null>(null)
  const [ready, setReady] = useState(false)
  const queryClient = useQueryClient()
  useEffect(() => {
    let alive = true
    async function restore() {
      try {
        const stored = await sessionStorage.get()
        const parsed: unknown = stored ? JSON.parse(stored) : null
        if (alive && isValidSession(parsed)) setSession(parsed)
        else if (stored) await sessionStorage.clear()
      } catch { /* A fresh sign-in remains available if secure storage cannot be read. */ }
      finally { if (alive) setReady(true) }
    }
    void restore()
    return () => { alive = false }
  }, [])

  const logout = useCallback(async () => {
    // Remove persisted credentials before reporting a successful manual logout.
    await sessionStorage.clear()
    setSession(null)
    setSelection(null)
    await queryClient.cancelQueries()
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    const expire = (token?: string) => {
      if (token && token !== session?.accessToken) return
      setSession(null); setSelection(null); queryClient.clear(); void sessionStorage.clear().catch(() => {})
    }
    onUnauthorized(expire)
    if (!session) return () => onUnauthorized()
    const checkExpiry = () => { if (Date.parse(session.expiresAt) <= Date.now()) expire() }
    const timeout = setTimeout(checkExpiry, Math.min(Math.max(Date.parse(session.expiresAt) - Date.now(), 0), 2_147_483_647))
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') checkExpiry() })
    return () => { clearTimeout(timeout); subscription.remove(); onUnauthorized() }
  }, [session, queryClient])

  async function acceptResponse(response: LoginResponse) {
    const next = toSession(response)
    if (next) {
      await sessionStorage.set(JSON.stringify(next))
      queryClient.clear()
      setSession(next)
      setSelection(null)
    } else if (response.tenantSelection) setSelection(response.tenantSelection)
    else throw new Error('Không tìm thấy đơn vị làm việc cho tài khoản này.')
  }
  async function login(email: string, password: string) {
    await acceptResponse(await request<LoginResponse>('/api/auth/login', { method: 'POST', body: { email: email.trim(), password } }))
  }
  async function selectTenant(tenantId: string) {
    if (!selection || Date.parse(selection.expiresAt) <= Date.now()) {
      setSelection(null)
      throw new Error('Phiên chọn đơn vị đã hết hạn. Vui lòng đăng nhập lại.')
    }
    await acceptResponse(await request<LoginResponse>('/api/auth/select-tenant', { method: 'POST', body: { selectionToken: selection.selectionToken, tenantId } }))
  }
  async function updateProfile(profile: { fullName: string; phone: string | null }) {
    if (!session) return
    const next = { ...session, ...profile }
    await sessionStorage.set(JSON.stringify(next))
    setSession(next)
  }
  return <AuthContext value={{ session, selection, ready, login, selectTenant, cancelSelection: () => setSelection(null), logout, updateProfile }}>{children}</AuthContext>
}

export function useAuth() {
  const value = use(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}
