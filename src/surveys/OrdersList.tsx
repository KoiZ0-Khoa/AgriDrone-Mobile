import { useState } from 'react'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { RefreshControl, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ui } from '../ui/theme'
import { useAuth } from '../auth/AuthProvider'
import { Button, DataError, Empty, Heading, Loading, Screen } from '../ui/components'
import { getAssignedOrders, getOwnerOrders } from './api'
import { dateTime, PageButtons, RecordCard, SurveyAccess } from './components'
import { orderStatusLabel, surveyServiceLabels } from './orderWorkflow'

export function OrdersList({ manager = false }: { manager?: boolean }) { return <SafeAreaView edges={['top']} style={ui.fill}><SurveyAccess manager={manager}><List manager={manager} /></SurveyAccess></SafeAreaView> }
function List({ manager }: { manager: boolean }) {
  const token = useAuth().session!.accessToken
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: [manager ? 'manager-orders' : 'owner-orders', page], queryFn: async ({ signal }) => manager ? getAssignedOrders(token, page, signal) : getOwnerOrders(token, page, signal) })
  return <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch() }} />}>
    <Heading title={manager ? 'Khảo sát được giao' : 'Đơn khảo sát'} />
    {!manager ? <Button title="Đăng ký nông trại mới" onPress={() => router.push('/surveys/request')} /> : null}
    {query.isPending ? <Loading /> : query.isError ? <DataError error={query.error} retry={() => { void query.refetch() }} /> : query.data.items.length ? <View style={ui.stack}>
      {query.data.items.map(order => {
        const assigned = 'surveyServiceName' in order
        const appointment = assigned ? null : order.currentAppointment
        const rescheduling = (assigned ? order.currentAppointmentStatus : appointment?.status) === 'RESCHEDULE_REQUESTED'
        return <RecordCard key={order.surveyOrderId} title={order.farmName}
          description={assigned ? order.surveyServiceName : surveyServiceLabels[order.serviceType ?? '']}
          status={rescheduling ? (assigned ? 'Có yêu cầu đổi lịch' : 'Chờ lịch mới') : orderStatusLabel(order.status)}
          note={!rescheduling && appointment ? dateTime(appointment.startAt) : undefined}
          onPress={() => router.push(manager ? `/manager/orders/${order.surveyOrderId}` : `/surveys/orders/${order.surveyOrderId}`)} />
      })}
    </View> : <Empty title="Chưa có đơn khảo sát" />}
    <PageButtons page={page} hasNext={query.data?.hasNextPage} disabled={query.isFetching} change={setPage} />
  </Screen>
}
