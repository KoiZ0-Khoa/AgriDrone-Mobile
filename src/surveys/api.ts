import { request } from '../api/client'
import type { AssignedFarm, Intake, Page, PublicService } from './types'
import type { Appointment, AppointmentBody, AssignedOrder, OrderScope, OrthophotoBody, PaymentSession } from './orderTypes'
import type { OwnerAppointmentBody, OwnerSurveyOrder } from './ownerOrderTypes'
import type { PaymentHistory } from './paymentWorkflow'

const manager = '/api/system-manager/survey-orders', owner = '/api/tenant-owner/survey-orders', id = encodeURIComponent
export const getAssignedFarms = (token: string, signal?: AbortSignal) => request<AssignedFarm[]>('/api/system-manager/farms', { token, signal })
export async function getAssignedOrders(token: string, page = 1, signal?: AbortSignal) {
  const result = await request<Page<AssignedOrder>>(`${manager}?pageNumber=${page}&pageSize=20`, { token, signal })
  return { ...result, items: result.items.map(item => ({ ...item, currentAppointmentStatus: item.currentAppointmentStatus === 'RESCHEDULEREQUESTED' ? 'RESCHEDULE_REQUESTED' : item.currentAppointmentStatus })) }
}
export async function getAssignedOrder(token: string, orderId: string, signal?: AbortSignal) {
  let pageNumber = 1
  while (true) {
    const page = await getAssignedOrders(token, pageNumber, signal)
    const found = page.items.find(item => item.surveyOrderId.toLowerCase() === orderId.toLowerCase())
    if (found) return found
    if (!page.hasNextPage) return null
    pageNumber++
  }
}
export const getOrderScope = (token: string, orderId: string, signal?: AbortSignal) => request<OrderScope>(`${manager}/${id(orderId)}/boundary-scope`, { token, signal })
export const proposeAppointment = (token: string, orderId: string, body: AppointmentBody) => request<Appointment>(`${manager}/${id(orderId)}/appointments`, { token, method: 'POST', body })
export const markOrthophotoCorners = (token: string, orderId: string, body: OrthophotoBody) => request(`${manager}/${id(orderId)}/farm-boundary/mark-orthophoto-corners`, { token, method: 'POST', body })
export const confirmPoleCount = (token: string, orderId: string, body: { expectedOrderVersion: number; expectedFarmBaseMapVersionId: string; evidenceReference: string | null }) => request(`${manager}/${id(orderId)}/pole-count/confirm`, { token, method: 'POST', body })
export const getOwnerOrders = (token: string, page = 1, signal?: AbortSignal) => request<Page<OwnerSurveyOrder>>(`${owner}?pageNumber=${page}&pageSize=20`, { token, signal })
export async function getOwnerOrder(token: string, orderId: string, signal?: AbortSignal) {
  const result = await request<OwnerSurveyOrder>(`${owner}/${id(orderId)}`, { token, signal })
  if (result.surveyOrderId.toLowerCase() !== orderId.toLowerCase()) throw new Error('Thông tin đơn không khớp yêu cầu. Tải lại để kiểm tra.')
  return result
}
export const confirmOwnerAppointment = (token: string, orderId: string, appointmentId: string, body: OwnerAppointmentBody) => request<Appointment>(`${owner}/${id(orderId)}/appointments/${id(appointmentId)}/confirm`, { token, method: 'POST', body })
export const requestOwnerReschedule = (token: string, orderId: string, appointmentId: string, body: OwnerAppointmentBody & { reason: string }) => request<Appointment>(`${owner}/${id(orderId)}/appointments/${id(appointmentId)}/request-reschedule`, { token, method: 'POST', body })
export async function getPaymentHistory(token: string, orderId: string, signal?: AbortSignal) {
  const result = await request<PaymentHistory>(`${owner}/${id(orderId)}/payments`, { token, signal })
  if (result.surveyOrderId.toLowerCase() !== orderId.toLowerCase()) throw new Error('Lịch sử thanh toán không khớp đơn.')
  return result
}
export const initiatePayment = (token: string, orderId: string, body: { expectedOrderVersion: number; purpose: string }) => request<PaymentSession>(`${owner}/${id(orderId)}/payments`, { token, method: 'POST', body })
export const getPublicServices = (signal?: AbortSignal) => request<PublicService[]>('/api/public/survey-services', { signal })
export const submitSurveyRequest = (token: string, farmId: string | undefined, body: Intake, key: string) => request<{ id: string }>(farmId ? `/api/tenant-owner/farms/${id(farmId)}/survey-requests` : '/api/tenant-owner/survey-requests/new-farm', { token, method: 'POST', headers: { 'Idempotency-Key': key }, body })
export const submitPublicRequest = (body: Intake & { tenantCode: string; tenantName: string; applicantName: string; applicantEmail: string; applicantPhone: string }, key: string) => request<{ id: string }>('/api/public/survey-requests', { method: 'POST', credentials: 'include', headers: { 'Idempotency-Key': key }, body })
