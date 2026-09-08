import { useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlashList } from '@shopify/flash-list'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { assignManager, getAdmins, getAssignment, getFarm } from '../../../src/api/farms'
import { ApiError } from '../../../src/api/client'
import type { Session, TenantUser } from '../../../src/api/types'
import { useAuth } from '../../../src/auth/AuthProvider'
import { canManageFarms } from '../../../src/auth/session'
import { Button, DataError, Detail, Empty, ErrorNotice, Field, Heading, Icon, isActive, Loading, Notice, Screen } from '../../../src/ui/components'
import { ui } from '../../../src/ui/theme'

export default function AssignmentScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>()
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<TenantUser | null>(null)
  const allowed = canManageFarms(session)
  const admins = useQuery({ queryKey: ['admins', session?.tenant.id], queryFn: ({ signal }) => getAdmins(session!.accessToken, signal), enabled: allowed })
  const farm = useQuery({ queryKey: ['farm', session?.tenant.id, farmId], queryFn: ({ signal }) => getFarm(session!.accessToken, farmId, signal), enabled: allowed })
  if (!allowed || !session) return <Screen><Empty icon="lock-closed-outline" title="Bạn chưa có quyền phân công" description="Tính năng này dành cho chủ đơn vị và quản trị viên đơn vị." /></Screen>
  if (farm.isPending || admins.isPending) return <Screen><Loading /></Screen>
  if (farm.isError || admins.isError) return <Screen><DataError error={farm.error ?? admins.error} retry={() => { void farm.refetch(); void admins.refetch() }} /></Screen>
  if (!isActive(farm.data.status)) return <Screen><Empty title="Nông trại đã ngừng hoạt động" description="Chỉ nông trại đang hoạt động mới có thể được phân công quản lý." /></Screen>
  if (selected) return <AssignmentEditor key={selected.id} farmId={farmId} farmName={farm.data.name} user={selected} session={session} onBack={() => setSelected(null)} />
  const needle = search.trim().toLocaleLowerCase('vi-VN')
  const users = admins.data.filter(user => `${user.fullName} ${user.email}`.toLocaleLowerCase('vi-VN').includes(needle))
  return <FlashList style={ui.fill} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={ui.page} data={users} keyExtractor={user => user.id}
    ListHeaderComponent={<View style={ui.stack}><Heading eyebrow={farm.data.code} title="Chọn người quản lý" description={`Gán quản trị viên đơn vị quản lý tất cả khu vực tại ${farm.data.name}.`} /><Field label="Tìm quản trị viên" placeholder="Tên hoặc email" value={search} onChangeText={setSearch} /></View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => setSelected(item)} style={({ pressed }) => [ui.card, ui.row, styles.user, pressed && ui.pressed]}><View style={ui.iconBox}><Icon name="person-outline" /></View><View style={ui.grow}><Text style={ui.heading}>{item.fullName}</Text><Text style={ui.muted}>{item.email}</Text></View><Icon name="chevron-forward" size={18} /></Pressable>}
    ListEmptyComponent={<Empty icon="people-outline" title={admins.data.length === 0 ? 'Chưa có quản trị viên phù hợp' : 'Không tìm thấy người phù hợp'} description={admins.data.length === 0 ? 'Đơn vị cần có quản trị viên đang hoạt động để phân công quản lý.' : 'Thử tìm bằng tên hoặc email khác.'} />}
  />
}
function AssignmentEditor({ farmId, farmName, user, session, onBack }: { farmId: string; farmName: string; user: TenantUser; session: Session; onBack: () => void }) {
  const [reason, setReason] = useState('')
  const queryClient = useQueryClient()
  const key = ['assignment', session.tenant.id, farmId, user.id]
  const assignment = useQuery({ queryKey: key, queryFn: ({ signal }) => getAssignment(session.accessToken, farmId, user.id, signal), staleTime: 0 })
  const mutation = useMutation({ mutationFn: () => assignManager(session.accessToken, farmId, user.id, assignment.data?.version ?? null, reason), onSuccess: result => { queryClient.setQueryData(key, result); setReason('') } })
  const conflict = mutation.error instanceof ApiError && ['FarmMembership.ConcurrentUpdate', 'FarmMembership.ExpectedVersionRequired'].includes(mutation.error.code ?? '')
  const forbidden = mutation.error instanceof ApiError && mutation.error.status === 403
  const alreadyAssigned = assignment.data?.status === 'ACTIVE' && assignment.data.role === 'MANAGER' && assignment.data.accessScope === 'ALL_ZONES'
  if (assignment.isPending) return <Screen><Loading /></Screen>
  if (assignment.isError) return <Screen><DataError error={assignment.error} retry={() => { void assignment.refetch() }} /><Button title="Chọn người khác" secondary onPress={onBack} /></Screen>
  return <Screen><Heading eyebrow="PHÂN CÔNG QUẢN LÝ" title={user.fullName} description={user.email} /><View style={ui.card}><Detail label="Nông trại" value={farmName} /><Detail label="Vai trò sẽ cấp" value="Quản lý nông trại" /><Detail label="Phạm vi sẽ cấp" value="Tất cả khu vực" /></View>
    {mutation.isSuccess ? <Notice title="Đã lưu phân công" description={`${user.fullName} đã được cấp quyền quản lý nông trại này.`} /> : alreadyAssigned ? <Notice title="Đã có quyền quản lý tất cả khu vực" /> : assignment.data ? <Notice title="Đã có phân công trước đó" description={`Hiện tại: ${assignment.data.role === 'MANAGER' ? 'Quản lý' : 'Nhân viên'}, ${assignment.data.accessScope === 'ALL_ZONES' ? 'tất cả khu vực' : 'khu vực được chọn'}, ${assignment.data.status === 'ACTIVE' ? 'đang hoạt động' : 'ngừng hoạt động'}. Lưu để cập nhật sang quyền quản lý tất cả khu vực.`} /> : <Notice title="Chưa được phân công vào nông trại" />}
    {conflict ? <><Notice error title="Phân công vừa được người khác cập nhật" description="Tải lại thông tin mới nhất trước khi lưu." /><Button title="Tải lại phân công" secondary loading={assignment.isFetching} onPress={() => { void assignment.refetch().then(() => mutation.reset()) }} /></> : <ErrorNotice error={mutation.error} />}
    {!alreadyAssigned ? <><Field label="Lý do phân công (không bắt buộc)" value={reason} onChangeText={setReason} multiline maxLength={500} editable={!mutation.isPending} placeholder="Tối đa 500 ký tự" /><Button title={assignment.data ? 'Cập nhật phân công' : 'Gán quản lý nông trại'} loading={mutation.isPending} disabled={conflict || forbidden || assignment.isFetching} onPress={() => { if (!conflict && !forbidden && !assignment.isFetching && !mutation.isPending) mutation.mutate() }} /></> : null}
    <Button title="Chọn người khác" secondary disabled={mutation.isPending} onPress={onBack} />
  </Screen>
}
const styles = StyleSheet.create({ user: { marginTop: 14 } })
