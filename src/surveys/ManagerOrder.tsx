import { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshControl, Text, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import { Button, DataError, Detail, Empty, Heading, Loading, Notice, Screen } from '../ui/components'
import { ui } from '../ui/theme'
import { ActionModal } from '../management/ActionModal'
import { text, type Action, type Field } from '../management/actions'
import { getAssignedOrder, getOrderScope, proposeAppointment, markOrthophotoCorners, confirmPoleCount } from './api'
import { appointmentBody, appointmentStatusLabels, matchingOrderSnapshot, orderStatusLabel, orthophotoBody } from './orderWorkflow'
import { dateTime, OrderStatus, SurveyAccess } from './components'
import { getFarmContext } from './farmApi'
import { intakeCoordinate } from './intakeNumbers'
import { validGuid } from './baseMapWorkflow'
import { vietnamDateTime } from './schedule'

export function ManagerOrder() {
  const { orderId = '' } = useLocalSearchParams<{ orderId: string }>()
  return <SurveyAccess manager>{validGuid(orderId) ? <Order orderId={orderId} /> : <Screen><Empty title="Liên kết không hợp lệ" description="Mở đơn từ danh sách công việc." /></Screen>}</SurveyAccess>
}
function Order({ orderId }: { orderId: string }) {
  const token = useAuth().session!.accessToken, client = useQueryClient()
  const [action, setAction] = useState<Action | null>(null)
  const query = useQuery({ queryKey: ['manager-order', orderId], queryFn: ({ signal }) => getAssignedOrder(token, orderId, signal) })
  const scope = useQuery({ queryKey: ['manager-scope', orderId], queryFn: ({ signal }) => getOrderScope(token, orderId, signal), enabled: !!query.data })
  const farm = useQuery({ queryKey: ['manager-farm', query.data?.farmId], queryFn: ({ signal }) => getFarmContext(token, query.data!.farmId, signal), enabled: !!query.data && query.data.status === 'AWAITING_PRICING' })
  const refresh = async () => { await client.invalidateQueries({ queryKey: ['manager-order', orderId] }); await client.invalidateQueries({ queryKey: ['manager-scope', orderId] }); await client.invalidateQueries({ queryKey: ['manager-orders'] }); await client.invalidateQueries({ queryKey: ['manager-farm'] }) }
  if (query.isPending) return <Screen><Loading /></Screen>
  if (query.isError) return <Screen><DataError error={query.error} retry={() => { void refresh() }} /></Screen>
  if (!query.data) return <Screen><Empty title="Không tìm thấy đơn được giao" description="Đơn không còn thuộc phân công hiện tại của bạn." /></Screen>
  const order = query.data, snapshot = scope.data
  const consistent = !!snapshot && matchingOrderSnapshot(order, snapshot)
  const busy = query.isFetching || scope.isFetching
  const canSchedule = consistent && ['AWAITING_BASELINE_APPOINTMENT', 'AWAITING_PAID_APPOINTMENT'].includes(order.status) && (!order.currentAppointmentId || order.currentAppointmentStatus === 'RESCHEDULE_REQUESTED')
  const cornerFields: Field[] = Array.from({ length: 4 }, (_, i) => [{ key: `lng${i}`, label: `Góc ${i + 1} · Kinh độ`, kind: 'number' as const }, { key: `lat${i}`, label: `Góc ${i + 1} · Vĩ độ`, kind: 'number' as const }]).flat()
  return <Screen refreshControl={<RefreshControl refreshing={busy} onRefresh={() => { void refresh() }} />}>
    <View style={ui.smallStack}>
      <Heading title={order.farmName} description={order.surveyServiceName} />
      <OrderStatus label={orderStatusLabel(order.status)} />
    </View>
    <View style={[ui.card, ui.smallStack]}><Detail label="Lịch hẹn" value={order.currentAppointmentStatus === 'RESCHEDULE_REQUESTED' ? 'Có yêu cầu đổi lịch' : appointmentStatusLabels[order.currentAppointmentStatus ?? ''] ?? 'Chưa có lịch'} /><Button secondary title="Xem nông trại" onPress={() => router.push(`/manager/farms/${order.farmId}`)} /></View>
    {scope.isError ? <DataError error={scope.error} retry={() => { void refresh() }} /> : scope.isPending ? <Loading /> : !consistent ? <Notice error title="Dữ liệu đơn đã thay đổi" description="Kéo xuống để tải lại trước khi thao tác." /> : null}
    {canSchedule ? <Button title={order.currentAppointmentStatus === 'RESCHEDULE_REQUESTED' ? 'Đề xuất lịch mới' : 'Đề xuất lịch khảo sát'} disabled={busy} onPress={() => setAction({ title: 'Đề xuất lịch khảo sát', description: 'Giờ Việt Nam (UTC+7). Chủ đơn vị sẽ xác nhận lịch.', fields: [{ key: 'startDate', label: 'Ngày bắt đầu · YYYY-MM-DD', max: 10 }, { key: 'startTime', label: 'Giờ bắt đầu · HH:mm', max: 5 }, { key: 'endDate', label: 'Ngày kết thúc · YYYY-MM-DD', max: 10 }, { key: 'endTime', label: 'Giờ kết thúc · HH:mm', max: 5 }], run: v => proposeAppointment(token, orderId, appointmentBody(order, snapshot!, vietnamDateTime(v.startDate, v.startTime), vietnamDateTime(v.endDate, v.endTime))), after: refresh })} /> : null}
    {consistent && ['AWAITING_BASELINE_REVIEW', 'PENDING_BOUNDARY_VERIFICATION'].includes(order.status) ? <Button title="Xác minh 4 góc trên ảnh bản đồ" disabled={busy} onPress={() => setAction({ title: 'Xác minh ranh giới', description: 'Đối chiếu ảnh trực giao trên web và nhập 4 góc theo thứ tự quanh nông trại.', fields: [...cornerFields, { key: 'reason', label: 'Ghi chú xác minh', max: 2000 }], run: v => markOrthophotoCorners(token, orderId, orthophotoBody(snapshot!, Array.from({ length: 4 }, (_, i) => ({ longitude: intakeCoordinate(v[`lng${i}`], 'longitude'), latitude: intakeCoordinate(v[`lat${i}`], 'latitude') })), text(v, 'reason'))), after: refresh })} /> : null}
    <Button secondary title="Duyệt bản đồ nền" onPress={() => router.push({ pathname: '/manager/farms/[farmId]/base-map', params: { farmId: order.farmId, surveyOrderId: orderId } })} />
    {order.status === 'AWAITING_PRICING' ? <>{farm.isError ? <DataError error={farm.error} retry={() => { void farm.refetch() }} /> : null}{farm.isSuccess && !farm.data.publishedBaseMap ? <Text style={ui.muted}>Cần phát hành bản đồ nền trước.</Text> : null}<Button title="Xác nhận số trụ và giá" disabled={busy || !consistent || !farm.data?.publishedBaseMap || farm.isFetching} onPress={() => { const map = farm.data?.publishedBaseMap; if (!map) return; setAction({ title: 'Xác nhận số trụ và giá', description: 'Số trụ và giá được tính từ bản đồ đã phát hành.', fields: [], run: () => confirmPoleCount(token, orderId, { expectedOrderVersion: order.orderVersion, expectedFarmBaseMapVersionId: map.id, evidenceReference: null }), after: refresh }) }} /></> : null}
    {snapshot?.zones.length ? <View style={ui.card}><Text style={ui.heading}>Phạm vi khảo sát</Text>{snapshot.zones.map(zone => <Text key={zone.zoneId} style={ui.text}>{zone.name}</Text>)}</View> : null}
    <Text style={ui.muted}>Cập nhật {dateTime(order.updatedAt)}</Text>
    {action ? <ActionModal action={action} close={() => setAction(null)} /> : null}
  </Screen>
}
