import { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { FlashList } from '@shopify/flash-list'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../../src/auth/AuthProvider'
import { Button, DataError, Empty, Heading, Loading, Notice, Screen } from '../../../src/ui/components'
import { Segments } from '../../../src/ui/operations'
import { colors, ui } from '../../../src/ui/theme'
import { getFarmMembers } from '../../../src/management/api'
import { canRevokeFarmMember, farmRoleLabel, revokeFarmAction, type Action } from '../../../src/management/actions'
import { ActionModal } from '../../../src/management/ActionModal'

export default function FarmMembersScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>()
  return <FarmMembers key={farmId} farmId={farmId} />
}
function FarmMembers({ farmId }: { farmId: string }) {
  const { session } = useAuth()
  const [page, setPage] = useState(1)
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [action, setAction] = useState<Action | null>(null)
  const [saved, setSaved] = useState('')
  const allowed = session?.role === 'OWNER' || session?.role === 'TENANT_ADMIN'
  const query = useQuery({ queryKey: ['farm-members', session?.tenant.id, farmId, page, role, status], queryFn: ({ signal }) => getFarmMembers(session!.accessToken, farmId, page, role, status, signal), enabled: allowed })
  if (!session || !allowed) return <Screen><Empty title="Không có quyền quản lý thành viên" description="Danh sách này dành cho Owner và quản trị viên đơn vị." /></Screen>
  return <View style={ui.fill}><FlashList style={ui.fill} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={ui.page} data={query.isError ? [] : query.data?.items ?? []} keyExtractor={member => member.farmMembershipId}
    refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch() }} tintColor={colors.mint} />}
    ListHeaderComponent={<View style={ui.stack}><Heading title="Thành viên nông trại" description="Vai trò và phạm vi làm việc được phân công." />
      <Button title="Mời thành viên vào đơn vị" secondary icon="person-add-outline" onPress={() => router.push('/team')} />
      <Button title="Phân công thành viên" icon="people-outline" onPress={() => router.push(`/farm/${farmId}/assignment`)} />
      <Segments value={role} onChange={value => { setRole(value); setPage(1) }} options={[{ value: '', label: 'Tất cả vai trò' }, { value: 'MANAGER', label: 'Quản lý' }, { value: 'WORKER', label: 'Nhân viên' }]} />
      <Segments value={status} onChange={value => { setStatus(value); setPage(1) }} options={[{ value: 'ACTIVE', label: 'Đang giao' }, { value: 'INACTIVE', label: 'Đã thu hồi' }]} />
      {saved ? <Notice title={saved} /> : null}
    </View>}
    renderItem={({ item }) => <View style={styles.row}>
      <Text style={ui.heading}>{item.fullName}</Text><Text style={ui.muted}>{item.email}</Text><Text style={ui.text}>{farmRoleLabel(item.role)} · {item.status === 'ACTIVE' ? 'Đang phân công' : 'Đã thu hồi'}</Text>
      <Text style={ui.muted}>{item.accessScope === 'ALL_ZONES' ? 'Tất cả khu vực' : `${item.zoneIds.length} khu vực được chọn`}</Text>
      {canRevokeFarmMember(session.role, item) ? <Button secondary title="Thu hồi phân công" icon="remove-circle-outline" onPress={() => { setSaved(''); setAction(revokeFarmAction(session.accessToken, { ...item }, session.role)) }} /> : item.status === 'ACTIVE' ? <Text style={ui.muted}>Chỉ Owner được thu hồi phân công này.</Text> : null}
    </View>}
    ListEmptyComponent={query.isPending ? <Loading /> : query.isError ? <DataError error={query.error} retry={() => { void query.refetch() }} /> : <Empty title="Chưa có thành viên phù hợp" description="Thử đổi bộ lọc hoặc tải lại sau khi phân công thành viên." />}
    ListFooterComponent={<View style={ui.stack}><Text style={ui.muted}>Trang {page} · {query.data?.totalCount ?? 0} thành viên</Text><Button secondary title="Trang trước" disabled={page === 1 || query.isFetching} onPress={() => setPage(p => p - 1)} /><Button secondary title="Trang sau" disabled={!query.data?.hasNextPage || query.isFetching} onPress={() => setPage(p => p + 1)} /></View>}
  />{action ? <ActionModal action={action} close={() => setAction(null)} success={setSaved} /> : null}</View>
}
const styles = StyleSheet.create({ row: { paddingVertical: 22, borderBottomWidth: 1, borderColor: colors.border, gap: 10 } })
