import { useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AppState, RefreshControl, StyleSheet, Text, View } from 'react-native'
import * as Linking from 'expo-linking'
import { useAuth } from '../auth/AuthProvider'
import { Button, DataError, Detail, Empty, Heading, Loading, Notice, Screen } from '../ui/components'
import { colors, fonts, ui } from '../ui/theme'
import { ActionModal } from '../management/ActionModal'
import type { Action } from '../management/actions'
import { confirmOwnerAppointment, getOwnerOrder, getPaymentHistory, initiatePayment, requestOwnerReschedule } from './api'
import { canConfirmOwnerAppointment, canInitiateOwnerPayment, canRescheduleOwnerAppointment, ownerAppointmentBody, ownerPaymentBody, ownerOrderFingerprint } from './ownerOrderWorkflow'
import { appointmentStatusLabels, orderStatusLabel, surveyServiceLabels } from './orderWorkflow'
import { paymentCheckoutUrl, paymentIsPaid, paymentPurposeLabels, paymentStatusLabels, money } from './paymentWorkflow'
import type { PaymentSession } from './orderTypes'
import { dateTime, OrderStatus, SurveyAccess } from './components'
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
    <View style={ui.smallStack}>
      <Heading title={order.farmName} description={surveyServiceLabels[order.serviceType ?? '']} />
      <OrderStatus label={orderStatusLabel(order.status)} />
    </View>
    <View style={ui.card}><Text style={ui.heading}>Lịch khảo sát</Text>{appointment ? <>
      <Text style={ui.muted}>{[appointment.purpose === 'BASELINE_MAPPING' ? 'Bản đồ nền' : null, appointmentStatusLabels[appointment.status]].filter(Boolean).join(' · ') || 'Đang cập nhật lịch'}</Text>
      <View><Detail label="Bắt đầu" value={dateTime(appointment.startAt)} /><Detail label="Kết thúc" value={dateTime(appointment.endAt)} /></View>
      {appointment.status === 'PROPOSED' && Date.parse(appointment.endAt) <= Date.now() ? <Notice title="Lịch đã hết hạn" description="Gửi yêu cầu đổi lịch để chọn thời gian mới." /> : null}
      {canConfirmOwnerAppointment(order) ? <Button title="Xác nhận lịch" disabled={busy} onPress={() => setAction({ title: 'Xác nhận lịch khảo sát', description: `${dateTime(appointment.startAt)} – ${dateTime(appointment.endAt)}`, fields: [], run: async () => { assertCurrent(); await confirmOwnerAppointment(token, orderId, appointment.appointmentId, ownerAppointmentBody(order)) }, after: refresh })} /> : null}
      {canRescheduleOwnerAppointment(order, history.data) ? <Button secondary title="Yêu cầu đổi lịch" disabled={busy} onPress={() => setAction({ title: 'Yêu cầu đổi lịch', fields: [{ key: 'reason', label: 'Lý do và thời gian bạn mong muốn', kind: 'multiline', max: 2000 }], run: async v => { assertCurrent(); await requestOwnerReschedule(token, orderId, appointment.appointmentId, { ...ownerAppointmentBody(order), reason: v.reason.trim() }) }, after: refresh })} /> : null}
    </> : <Text style={ui.muted}>Chưa có lịch hẹn.</Text>}</View>
    <View style={[ui.card, ui.smallStack]}><Text style={ui.heading}>Chi phí</Text><View><Detail label="Tiền cọc" value={money(order.depositAmount, order.currency)} /><Detail label="Tổng chi phí" value={money(order.totalAmount, order.currency)} /><Detail label="Còn phải trả" value={money(order.remainingAmount, order.currency)} /></View></View>
    <View style={ui.card}><Text style={ui.heading}>Thanh toán</Text><Button secondary title="Kiểm tra trạng thái" loading={busy} onPress={() => { void refresh() }} />
      {history.isPending ? <Loading /> : history.isError ? <DataError error={history.error} retry={() => { void history.refetch() }} /> : null}
      {canInitiateOwnerPayment(order, history.data) ? <Button title={order.status === 'AWAITING_BASELINE_DEPOSIT' ? 'Thanh toán tiền cọc' : 'Thanh toán phần còn lại'} disabled={busy} onPress={() => setAction({ title: 'Chuẩn bị thanh toán', description: 'Sau khi xác nhận, mở trang thanh toán để tiếp tục.', fields: [], run: async () => { assertCurrent(); const latest = client.getQueryData<typeof history.data>(['owner-payments', orderId]); const result = await initiatePayment(token, orderId, ownerPaymentBody(order, latest)); paymentCheckoutUrl(result, orderId); setPayment(result) }, after: refresh })} /> : null}
      {payment && !paid && !paymentIsPaid(payment.paymentStatus) ? <><Detail label="Số tiền" value={money(payment.amount, payment.currency)} /><Text style={ui.muted}>Hết hạn {dateTime(payment.expiresAt)}</Text><Button title="Mở trang thanh toán" onPress={() => { void openPayment() }} /><Text style={ui.muted}>Sau khi thanh toán, quay lại để kiểm tra trạng thái.</Text></> : null}
      {linkError ? <DataError error={linkError} retry={() => { void refresh() }} /> : null}
      {history.data?.payments.map(item => <View key={item.surveyPaymentId} style={styles.transaction}>
        <View style={ui.spread}><Text style={[ui.text, ui.grow]}>{paymentPurposeLabels[item.purpose] ?? 'Giao dịch khảo sát'}</Text><Text style={styles.amount}>{money(item.amount, item.currency)}</Text></View>
        <Text style={ui.muted}>{paymentStatusLabels[item.status] ?? 'Đang cập nhật trạng thái'} · {dateTime(item.confirmedAt ?? item.createdAt)}</Text>
      </View>)}
      {history.isSuccess && !history.data.payments.length ? <Text style={ui.muted}>Chưa có giao dịch.</Text> : null}
    </View>
    {action ? <ActionModal action={action} close={() => setAction(null)} /> : null}
  </Screen>
}

const styles = StyleSheet.create({
  transaction: { gap: 4, paddingTop: 12, borderTopWidth: 1, borderColor: colors.border },
  amount: { ...ui.text, fontFamily: fonts.semibold, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
})
