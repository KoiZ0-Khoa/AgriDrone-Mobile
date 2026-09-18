import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FlashList } from '@shopify/flash-list'
import { router } from 'expo-router'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import { Button, DataError, Empty, Heading, Loading } from '../ui/components'
import { Segments } from '../ui/operations'
import { colors, ui } from '../ui/theme'
import { getMyFarmAssignments } from './api'
import { farmRoleLabel } from './actions'

export function MyFarms() {
  const { session } = useAuth()
  const [page, setPage] = useState(1)
  const [role, setRole] = useState('')
  const query = useQuery({ queryKey: ['my-farm-assignments', session?.tenant.id, session?.email, page, role], queryFn: ({ signal }) => getMyFarmAssignments(session!.accessToken, page, role, signal), enabled: Boolean(session) })
  return <FlashList style={ui.fill} contentContainerStyle={ui.page} contentInsetAdjustmentBehavior="automatic" data={query.isError ? [] : query.data?.items ?? []} keyExtractor={item => item.farmMembershipId}
    refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch() }} tintColor={colors.mint} />}
    ListHeaderComponent={<View style={ui.stack}><Heading title="Nông trại được giao" description={session?.tenant.name} /><Text style={ui.muted}>Phân công đang hoạt động và khu vực bạn được phép làm việc.</Text><Segments value={role} onChange={value => { setRole(value); setPage(1) }} options={[{ value: '', label: 'Tất cả' }, { value: 'MANAGER', label: 'Quản lý' }, { value: 'WORKER', label: 'Nhân viên' }]} /></View>}
    renderItem={({ item }) => <View style={styles.row}>
      <Text style={ui.kicker}>{item.farm.code} · {farmRoleLabel(item.role)}</Text><Text style={ui.heading}>{item.farm.name}</Text><Text style={ui.muted}>{item.farm.address ?? 'Chưa cập nhật địa chỉ'}</Text>
      <Text style={ui.text}>{item.accessScope === 'ALL_ZONES' ? 'Tất cả khu vực' : 'Các khu vực được chọn'}</Text>
      {item.zones.length ? item.zones.map(zone => <Text key={zone.id} style={ui.muted}>{zone.name} · {zone.code}</Text>) : <Text style={ui.muted}>Chưa có khu vực hoạt động trong phạm vi này.</Text>}
      <Button secondary title="Mở nông trại" icon="arrow-forward" onPress={() => router.push(`/farm/${item.farm.id}`)} />
    </View>}
    ListEmptyComponent={query.isPending ? <Loading /> : query.isError ? <DataError error={query.error} retry={() => { void query.refetch() }} /> : <Empty title="Chưa có nông trại được giao" description="Phân công phù hợp sẽ xuất hiện khi quản trị viên cấp quyền. Thử đổi bộ lọc hoặc kéo để tải lại." />}
    ListFooterComponent={<View style={ui.stack}><Text style={ui.muted}>Trang {page} · {query.data?.totalCount ?? 0} phân công</Text><Button secondary title="Trang trước" disabled={page === 1 || query.isFetching} onPress={() => setPage(p => p - 1)} /><Button secondary title="Trang sau" disabled={!query.data?.hasNextPage || query.isFetching} onPress={() => setPage(p => p + 1)} /></View>}
  />
}
const styles = StyleSheet.create({ row: { paddingVertical: 24, borderBottomWidth: 1, borderColor: colors.border, gap: 10 } })
