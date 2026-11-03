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
import { orderStatusLabels } from './orderWorkflow'

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
    <Heading eyebrow="SYSTEM MANAGER" title={farmsOnly ? 'Nông trại phụ trách' : 'Công việc của bạn'} description="Nông trại và công việc bạn đang được phân công." />
    {!farmsOnly ? <><View style={ui.card}><Text style={ui.heading}>{farms.data?.length ?? '—'} nông trại phụ trách</Text><Text style={ui.text}>{orders.data?.totalCount ?? '—'} đơn khảo sát</Text></View><Button title="Đơn khảo sát được giao" icon="calendar-outline" onPress={() => router.push('/work')} /></> : null}
    <Field label="Tìm nông trại" placeholder="Tên hoặc địa chỉ" value={search} onChangeText={setSearch} />
    {farms.isPending ? <Loading /> : farms.isError ? <DataError error={farms.error} retry={refresh} /> : visible.length ? visible.map(farm => <RecordCard key={farm.farmId} title={farm.name} description={farm.address ?? undefined} note={formatArea(farm.areaHectares)} onPress={() => router.push(`/manager/farms/${farm.farmId}`)} />) : <Empty title={search ? 'Không tìm thấy nông trại' : 'Chưa có nông trại được giao'} description="System Admin phân công khi phê duyệt yêu cầu khảo sát hoặc qua chức năng phân công nông trại." />}
    {!farmsOnly ? <><Text style={ui.heading}>Đơn khảo sát gần đây</Text>{orders.isPending ? <Loading /> : orders.isError ? <DataError error={orders.error} retry={refresh} /> : orders.data?.items.slice(0, 3).map(order => <RecordCard key={order.surveyOrderId} title={order.farmName} description={order.surveyServiceName} note={order.currentAppointmentStatus === 'RESCHEDULE_REQUESTED' ? 'Owner yêu cầu đổi lịch' : orderStatusLabels[order.status] ?? order.status} onPress={() => router.push(`/manager/orders/${order.surveyOrderId}`)} />)}</> : null}
  </Screen>
}
