import { useState } from 'react'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { RefreshControl, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../auth/AuthProvider'
import { Button, DataError, Empty, Field, Heading, Loading, Screen, formatArea } from '../ui/components'
import { ui } from '../ui/theme'
import { getAssignedFarms, getAssignedOrders } from './api'
import { RecordCard, SurveyAccess } from './components'
import { orderStatusLabel } from './orderWorkflow'

export function ManagerHome({ farmsOnly = false }: { farmsOnly?: boolean }) {
  return <SafeAreaView edges={['top']} style={ui.fill}><SurveyAccess manager><ManagerDashboard farmsOnly={farmsOnly} /></SurveyAccess></SafeAreaView>
}
function ManagerDashboard({ farmsOnly }: { farmsOnly: boolean }) {
  const token = useAuth().session!.accessToken
  const [search, setSearch] = useState('')
  const farms = useQuery({ queryKey: ['manager-farms'], queryFn: ({ signal }) => getAssignedFarms(token, signal) })
  const orders = useQuery({ queryKey: ['manager-orders', 1], queryFn: ({ signal }) => getAssignedOrders(token, 1, signal), enabled: !farmsOnly })
  const refresh = () => { void farms.refetch(); if (!farmsOnly) void orders.refetch() }
  const visible = farms.data?.filter(farm => `${farm.name} ${farm.address ?? ''}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN'))) ?? []
  return <Screen refreshControl={<RefreshControl refreshing={farms.isRefetching || orders.isRefetching} onRefresh={refresh} />}>
    <Heading title={farmsOnly ? 'Nông trại phụ trách' : 'Công việc của bạn'} />
    {!farmsOnly ? <><View style={[ui.card, ui.smallStack]}><Text style={ui.heading}>{farms.data?.length ?? '—'} nông trại</Text><Text style={ui.muted}>{orders.data?.totalCount ?? '—'} đơn khảo sát</Text></View><Button title="Xem đơn khảo sát" icon="calendar-outline" onPress={() => router.push('/work')} /></> : null}
    <Field label="Tìm nông trại" placeholder="Tên hoặc địa chỉ" value={search} onChangeText={setSearch} />
    {farms.isPending ? <Loading /> : farms.isError ? <DataError error={farms.error} retry={refresh} /> : visible.length ? visible.map(farm => <RecordCard key={farm.farmId} title={farm.name} description={farm.address ?? undefined} note={formatArea(farm.areaHectares)} onPress={() => router.push(`/manager/farms/${farm.farmId}`)} />) : <Empty title={search ? 'Không tìm thấy nông trại' : 'Chưa có nông trại được giao'} />}
    {!farmsOnly ? <View style={ui.stack}><Text style={ui.heading}>Khảo sát gần đây</Text>{orders.isPending ? <Loading /> : orders.isError ? <DataError error={orders.error} retry={refresh} /> : orders.data?.items.length ? orders.data.items.slice(0, 3).map(order => <RecordCard key={order.surveyOrderId} title={order.farmName} description={order.surveyServiceName} status={order.currentAppointmentStatus === 'RESCHEDULE_REQUESTED' ? 'Có yêu cầu đổi lịch' : orderStatusLabel(order.status)} onPress={() => router.push(`/manager/orders/${order.surveyOrderId}`)} />) : <Text style={ui.muted}>Chưa có đơn khảo sát.</Text>}</View> : null}
  </Screen>
}
