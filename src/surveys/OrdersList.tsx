import { useState } from 'react'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ui } from '../ui/theme'
import { useAuth } from '../auth/AuthProvider'
import { Button, DataError, Empty, Heading, Loading, Screen } from '../ui/components'
import { getAssignedOrders, getOwnerOrders } from './api'
import { dateTime, PageButtons, RecordCard, SurveyAccess } from './components'
import { orderStatusLabels } from './orderWorkflow'

export function OrdersList({ manager = false }: { manager?: boolean }) { return <SafeAreaView edges={['top']} style={ui.fill}><SurveyAccess manager={manager}><List manager={manager} /></SurveyAccess></SafeAreaView> }
function List({ manager }: { manager: boolean }) {
  const token = useAuth().session!.accessToken
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: [manager ? 'manager-orders' : 'owner-orders', page], queryFn: async ({ signal }) => manager ? getAssignedOrders(token, page, signal) : getOwnerOrders(token, page, signal) })
  return <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch() }} />}>
    <Heading title={manager ? 'Đơn khảo sát được giao' : 'Đơn khảo sát & thanh toán'} description={manager ? 'Đề xuất lịch và theo dõi công việc ngoài hiện trường.' : 'Xem lịch hẹn, xác nhận và theo dõi thanh toán.'} />
    {!manager ? <Button title="Đăng ký nông trại mới" onPress={() => router.push('/surveys/request')} /> : null}
    {query.isPending ? <Loading /> : query.isError ? <DataError error={query.error} retry={() => { void query.refetch() }} /> : query.data.items.length ? query.data.items.map(order => <RecordCard key={order.surveyOrderId} title={order.farmName} description={orderStatusLabels[order.status] ?? order.status} note={'currentAppointmentStatus' in order && order.currentAppointmentStatus === 'RESCHEDULE_REQUESTED' ? 'Owner yêu cầu đổi lịch' : 'currentAppointment' in order && order.currentAppointment ? dateTime(order.currentAppointment.startAt) : undefined} onPress={() => router.push(manager ? `/manager/orders/${order.surveyOrderId}` : `/surveys/orders/${order.surveyOrderId}`)} />) : <Empty title="Chưa có đơn khảo sát" description={manager ? 'Các đơn được phân công sẽ xuất hiện tại đây.' : 'Gửi yêu cầu khảo sát để bắt đầu.'} />}
    <PageButtons page={page} hasNext={query.data?.hasNextPage} disabled={query.isFetching} change={setPage} />
  </Screen>
}
