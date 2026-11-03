import { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AppState, RefreshControl, Text, View } from 'react-native'
import * as Linking from 'expo-linking'
import { useAuth } from '../auth/AuthProvider'
import { Button, DataError, Detail, Empty, Heading, Loading, Notice, Screen } from '../ui/components'
import { ui } from '../ui/theme'
import { ActionModal } from '../management/ActionModal'
import type { Action } from '../management/actions'
import { confirmOwnerAppointment, getOwnerOrder, getPaymentHistory, initiatePayment, requestOwnerReschedule } from './api'
import { canConfirmOwnerAppointment, canInitiateOwnerPayment, canRescheduleOwnerAppointment, ownerAppointmentBody, ownerPaymentBody, ownerOrderFingerprint } from './ownerOrderWorkflow'
import { appointmentStatusLabels, orderStatusLabels } from './orderWorkflow'
import { paymentCheckoutUrl, paymentIsPaid, paymentPurposeLabels, paymentStatusLabels, money } from './paymentWorkflow'
import type { PaymentSession } from './orderTypes'
import { dateTime, SurveyAccess } from './components'
import { validGuid } from './baseMapWorkflow'

export function OwnerOrder() {
  const { orderId = '' } = useLocalSearchParams<{ orderId: string }>()
  return <SurveyAccess>{validGuid(orderId) ? <Order orderId={orderId} /> : <Screen><Empty title="Liên kết không hợp lệ" description="Mở đơn từ danh sách thanh toán khảo sát." /></Screen>}</SurveyAccess>
}
function Order({ orderId }: { orderId: string }) {
  const token = useAuth().session!.accessToken, client = useQueryClient()
  const [action, setAction] = useState<Action | null>(null), [payment, setPayment] = useState<PaymentSession | null>(null), [linkError, setLinkError] = useState<unknown>(null)
  const queryKey = ['owner-order', orderId]
  const query = useQuery({ queryKey, queryFn: ({ signal }) => getOwnerOrder(token, orderId, signal) })
  const history = useQuery({ queryKey: ['owner-payments', orderId], queryFn: ({ signal }) => getPaymentHistory(token, orderId, signal), refetchInterval: result => result.state.data?.payments.some(item => ['PENDING', 'PROCESSING'].includes(item.status)) ? 15000 : false })
  const refresh = async () => { setLinkError(null); await Promise.all([query.refetch(), history.refetch(), client.invalidateQueries({ queryKey: ['owner-orders'] })]) }
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state === 'active') { void client.invalidateQueries({ queryKey }); void client.invalidateQueries({ queryKey: ['owner-payments', orderId] }) } })
    return () => listener.remove()
  }, [client, orderId])
  useEffect(() => { if (history.data?.payments.some(item => paymentIsPaid(item.status))) void client.invalidateQueries({ queryKey }) }, [history.data, client, orderId])
  if (query.isPending) return <Screen><Loading /></Screen>
  if (query.isError) return <Screen><DataError error={query.error} retry={() => { void refresh() }} /></Screen>
  const order = query.data, appointment = order.currentAppointment, busy = query.isFetching || history.isFetching
  const paid = history.data?.payments.some(item => item.surveyPaymentId === payment?.surveyPaymentId && paymentIsPaid(item.status))
  function assertCurrent() { const current = client.getQueryData<typeof order>(queryKey); if (!current || ownerOrderFingerprint(current) !== ownerOrderFingerprint(order) || client.getQueryState(queryKey)?.fetchStatus === 'fetching') throw new Error('Dữ liệu đơn đã thay đổi. Đóng và tải lại trước khi tiếp tục.') }
  async function openPayment() {
    try { setLinkError(null); if (!payment) return; const url = paymentCheckoutUrl(payment, orderId); if (url) await Linking.openURL(url) }
    catch (error) { setLinkError(error) }
  }
  return <Screen refreshControl={<RefreshControl refreshing={busy} onRefresh={() => { void refresh() }} />}>
    <Heading title={order.farmName} description={orderStatusLabels[order.status] ?? order.status} />
    <View style={ui.card}><Text style={ui.heading}>Lịch khảo sát</Text>{appointment ? <><Text style={ui.text}>{appointment.purpose === 'BASELINE_MAPPING' ? 'Khảo sát bản đồ nền' : 'Khảo sát sức khỏe cây'}</Text><Text style={ui.muted}>{appointmentStatusLabels[appointment.status] ?? appointment.status}</Text><Detail label="Bắt đầu" value={dateTime(appointment.startAt)} /><Detail label="Kết thúc" value={dateTime(appointment.endAt)} />{appointment.status === 'RESCHEDULE_REQUESTED' ? <Notice title="Đã gửi yêu cầu đổi lịch" description="Chờ Manager đề xuất thời gian mới." /> : null}{appointment.status === 'PROPOSED' && Date.parse(appointment.endAt) <= Date.now() ? <Notice title="Lịch đã hết thời gian xác nhận" description="Gửi yêu cầu đổi lịch để Manager đề xuất lại." /> : null}
      {canConfirmOwnerAppointment(order) ? <Button title="Xác nhận lịch" disabled={busy} onPress={() => setAction({ title: 'Xác nhận lịch khảo sát', description: `${dateTime(appointment.startAt)} – ${dateTime(appointment.endAt)}`, fields: [], run: async () => { assertCurrent(); await confirmOwnerAppointment(token, orderId, appointment.appointmentId, ownerAppointmentBody(order)) }, after: refresh })} /> : null}
      {canRescheduleOwnerAppointment(order, history.data) ? <Button secondary title="Yêu cầu đổi lịch" disabled={busy} onPress={() => setAction({ title: 'Yêu cầu đổi lịch', fields: [{ key: 'reason', label: 'Lý do và thời gian bạn mong muốn', kind: 'multiline', max: 2000 }], run: async v => { assertCurrent(); await requestOwnerReschedule(token, orderId, appointment.appointmentId, { ...ownerAppointmentBody(order), reason: v.reason.trim() }) }, after: refresh })} /> : null}
    </> : <Text style={ui.muted}>Manager chưa đề xuất lịch khảo sát.</Text>}</View>
    <View style={ui.card}><Text style={ui.heading}>Chi phí khảo sát</Text><Detail label="Cọc bản đồ nền" value={money(order.depositAmount, order.currency)} /><Detail label="Tổng dịch vụ" value={money(order.totalAmount, order.currency)} /><Detail label="Còn phải trả" value={money(order.remainingAmount, order.currency)} /></View>
    <View style={ui.card}><Text style={ui.heading}>Thanh toán</Text><Button secondary title="Kiểm tra trạng thái" loading={busy} onPress={() => { void refresh() }} />
      {history.isPending ? <Loading /> : history.isError ? <DataError error={history.error} retry={() => { void history.refetch() }} /> : null}
      {canInitiateOwnerPayment(order, history.data) ? <Button title={order.status === 'AWAITING_BASELINE_DEPOSIT' ? 'Thanh toán cọc bản đồ nền' : 'Thanh toán còn lại'} disabled={busy} onPress={() => setAction({ title: 'Tạo phiên thanh toán', description: 'Số tiền lấy từ máy chủ. Mở trang thanh toán sau khi tạo phiên.', fields: [], run: async () => { assertCurrent(); const latest = client.getQueryData<typeof history.data>(['owner-payments', orderId]); const result = await initiatePayment(token, orderId, ownerPaymentBody(order, latest)); paymentCheckoutUrl(result, orderId); setPayment(result) }, after: refresh })} /> : null}
      {payment && !paid && !paymentIsPaid(payment.paymentStatus) ? <><Detail label="Số tiền của phiên" value={money(payment.amount, payment.currency)} /><Text style={ui.muted}>Hết hạn {dateTime(payment.expiresAt)}</Text><Button title="Mở trang thanh toán" onPress={() => { void openPayment() }} /><Notice title="Chờ xác nhận từ máy chủ" description="Sau khi trả tiền, quay lại ứng dụng và kiểm tra trạng thái. Việc trở về ứng dụng không tự xác nhận thanh toán." /></> : null}
      {linkError ? <DataError error={linkError} retry={() => { void refresh() }} /> : null}
      {history.data?.payments.map(item => <View key={item.surveyPaymentId} style={ui.smallStack}><Text style={ui.heading}>{paymentPurposeLabels[item.purpose] ?? 'Giao dịch khảo sát'}</Text><Text style={ui.text}>{money(item.amount, item.currency)} · {paymentStatusLabels[item.status] ?? item.status}</Text><Text style={ui.muted}>{dateTime(item.confirmedAt ?? item.createdAt)}</Text></View>)}
      {history.isSuccess && !history.data.payments.length ? <Text style={ui.muted}>Chưa có giao dịch thanh toán.</Text> : null}
    </View>
    {action ? <ActionModal action={action} close={() => setAction(null)} /> : null}
  </Screen>
}
