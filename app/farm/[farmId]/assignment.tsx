import { useState } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlashList } from '@shopify/flash-list'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { assignFarmMember, getAssignableUsers, getAssignment, getFarm, getZones } from '../../../src/api/farms'
import { ApiError } from '../../../src/api/client'
import type { Assignment, AssignFarmMemberRequest, Session, TenantUser, Zone } from '../../../src/api/types'
import { useAuth } from '../../../src/auth/AuthProvider'
import { canManageFarms } from '../../../src/auth/session'
import { Button, DataError, Detail, Empty, ErrorNotice, Field, Heading, Icon, isActive, Loading, Notice, Screen } from '../../../src/ui/components'
import { ui } from '../../../src/ui/theme'
import { Segments } from '../../../src/ui/operations'

export default function AssignmentScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>()
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<TenantUser | null>(null)
  const allowed = canManageFarms(session)
  const admins = useQuery({ queryKey: ['assignable-users', session?.tenant.id, session?.role], queryFn: ({ signal }) => getAssignableUsers(session!.accessToken, session!.role, signal), enabled: allowed })
  const farm = useQuery({ queryKey: ['farm', session?.tenant.id, farmId], queryFn: ({ signal }) => getFarm(session!.accessToken, farmId, signal), enabled: allowed })
  if (!allowed || !session) return <Screen><Empty icon="lock-closed-outline" title="Bạn chưa có quyền phân công" description="Tính năng này dành cho chủ đơn vị và quản trị viên đơn vị." /></Screen>
  if (farm.isPending || admins.isPending) return <Screen><Loading /></Screen>
  if (farm.isError || admins.isError) return <Screen><DataError error={farm.error ?? admins.error} retry={() => { void farm.refetch(); void admins.refetch() }} /></Screen>
  if (!isActive(farm.data.status)) return <Screen><Empty title="Nông trại đã ngừng hoạt động" description="Chỉ nông trại đang hoạt động mới có thể được phân công quản lý." /></Screen>
  if (selected) return <AssignmentEditor key={selected.id} farmId={farmId} farmName={farm.data.name} user={selected} session={session} onBack={() => setSelected(null)} />
  const needle = search.trim().toLocaleLowerCase('vi-VN')
  const users = admins.data.filter(user => `${user.fullName} ${user.email}`.toLocaleLowerCase('vi-VN').includes(needle))
  return <FlashList style={ui.fill} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={ui.page} data={users} keyExtractor={user => user.id}
    ListHeaderComponent={<View style={ui.stack}><Heading eyebrow={farm.data.code} title="Phân công thành viên" description={`Chọn người và phạm vi làm việc tại ${farm.data.name}.`} /><Field label="Tìm thành viên" placeholder="Tên hoặc email" value={search} onChangeText={setSearch} /></View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => setSelected(item)} style={({ pressed }) => [ui.card, ui.row, styles.user, pressed && ui.pressed]}><View style={ui.iconBox}><Icon name="person-outline" /></View><View style={ui.grow}><Text style={ui.heading}>{item.fullName}</Text><Text style={ui.muted}>{item.email}</Text></View><Icon name="chevron-forward" size={18} /></Pressable>}
    ListEmptyComponent={<Empty icon="people-outline" title={admins.data.length === 0 ? 'Chưa có thành viên phù hợp' : 'Không tìm thấy người phù hợp'} description={admins.data.length === 0 ? 'Mời thành viên vào đơn vị và chờ họ chấp nhận. Chỉ Owner được phân công cho quản trị viên.' : 'Thử tìm bằng tên hoặc email khác.'} />}
  />
}
function AssignmentEditor({ farmId, farmName, user, session, onBack }: { farmId: string; farmName: string; user: TenantUser; session: Session; onBack: () => void }) {
  const queryClient = useQueryClient()
  const key = ['assignment', session.tenant.id, farmId, user.id]
  const assignment = useQuery({ queryKey: key, queryFn: ({ signal }) => getAssignment(session.accessToken, farmId, user.id, signal), staleTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false })
  const zones = useQuery({ queryKey: ['zones', session.tenant.id, farmId], queryFn: ({ signal }) => getZones(session.accessToken, farmId, signal) })
  const mutation = useMutation({ mutationFn: (body: AssignFarmMemberRequest) => assignFarmMember(session.accessToken, farmId, user.id, body), onSuccess: async result => {
    queryClient.setQueryData(key, result)
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['farm-members'] }), queryClient.invalidateQueries({ queryKey: ['my-farm-assignments'] })])
  } })
  const conflict = mutation.error instanceof ApiError && ['FarmMembership.ConcurrentUpdate', 'FarmMembership.ExpectedVersionRequired'].includes(mutation.error.code ?? '')
  const forbidden = mutation.error instanceof ApiError && mutation.error.status === 403
  if (assignment.isPending) return <Screen><Loading /></Screen>
  if (assignment.isError) return <Screen><DataError error={assignment.error} retry={() => { void assignment.refetch() }} /><Button title="Chọn người khác" secondary onPress={onBack} /></Screen>
  return <Screen><Heading eyebrow="PHÂN CÔNG THÀNH VIÊN" title={user.fullName} description={user.email} /><Detail label="Nông trại" value={farmName} />
    {mutation.isSuccess ? <Notice title="Đã lưu phân công" /> : null}
    {assignment.data ? <Notice title={assignment.data.status === 'ACTIVE' ? 'Đang được phân công' : 'Phân công đã được thu hồi'} description={`${assignment.data.role === 'MANAGER' ? 'Quản lý' : 'Nhân viên'} · ${assignment.data.accessScope === 'ALL_ZONES' ? 'Tất cả khu vực' : 'Khu vực được chọn'}`} /> : <Notice title="Chưa được phân công vào nông trại" />}
    {conflict ? <><Notice error title="Phân công vừa được người khác cập nhật" description="Tải lại thông tin mới nhất trước khi lưu." /><Button title="Tải lại phân công" secondary loading={assignment.isFetching} onPress={() => { void assignment.refetch().then(() => mutation.reset()) }} /></> : <ErrorNotice error={mutation.error} />}
    {zones.isPending ? <Loading /> : zones.isError ? <DataError error={zones.error} retry={() => { void zones.refetch() }} /> : <AssignmentForm key={assignment.data?.version ?? 'new'} user={user} assignment={assignment.data} zones={zones.data} busy={mutation.isPending} disabled={conflict || forbidden || assignment.isFetching} submit={body => mutation.mutate(body)} />}
    <Button title="Chọn người khác" secondary disabled={mutation.isPending} onPress={onBack} />
  </Screen>
}

function AssignmentForm({ user, assignment, zones, busy, disabled, submit }: { user: TenantUser; assignment: Assignment | null; zones: Zone[]; busy: boolean; disabled: boolean; submit: (body: AssignFarmMemberRequest) => void }) {
  const [role, setRole] = useState<'MANAGER' | 'WORKER'>(user.role === 1 ? 'MANAGER' : assignment?.role ?? 'WORKER')
  const [scope, setScope] = useState<'ALL_ZONES' | 'SELECTED_ZONES'>(assignment?.accessScope ?? 'ALL_ZONES')
  const [zoneIds, setZoneIds] = useState<string[]>(assignment?.zoneIds ?? [])
  const [reason, setReason] = useState('')
  const activeZones = zones.filter(zone => isActive(zone.status))
  const invalidZones = scope === 'SELECTED_ZONES' && (!zoneIds.length || zoneIds.some(id => !activeZones.some(zone => zone.zoneId === id)))
  return <View style={ui.stack}>
    <Text style={ui.heading}>Vai trò tại nông trại</Text>
    {user.role === 1 ? <Text style={ui.text}>Quản lý · Quản trị viên đơn vị chỉ được phân công vai trò này.</Text> : <View pointerEvents={busy || disabled ? 'none' : 'auto'}><Segments value={role} onChange={setRole} options={[{ value: 'MANAGER', label: 'Quản lý' }, { value: 'WORKER', label: 'Nhân viên' }]} /></View>}
    <Text style={ui.heading}>Phạm vi làm việc</Text>
    <View pointerEvents={busy || disabled ? 'none' : 'auto'}><Segments value={scope} onChange={setScope} options={[{ value: 'ALL_ZONES', label: 'Tất cả khu vực' }, { value: 'SELECTED_ZONES', label: 'Chọn khu vực' }]} /></View>
    {scope === 'SELECTED_ZONES' ? <View style={ui.stack}>{activeZones.map(zone => <Pressable key={zone.zoneId} accessibilityRole="checkbox" accessibilityLabel={zone.name} accessibilityState={{ checked: zoneIds.includes(zone.zoneId), disabled: busy || disabled }} disabled={busy || disabled} style={[ui.row, styles.zone]} onPress={() => setZoneIds(ids => ids.includes(zone.zoneId) ? ids.filter(id => id !== zone.zoneId) : [...ids, zone.zoneId])}><Icon name={zoneIds.includes(zone.zoneId) ? 'checkbox' : 'square-outline'} /><Text style={[ui.text, ui.grow]}>{zone.name} · {zone.code}</Text></Pressable>)}
      {zoneIds.filter(id => !activeZones.some(zone => zone.zoneId === id)).map(id => <Button key={id} secondary title="Bỏ khu vực không còn khả dụng" disabled={busy || disabled} onPress={() => setZoneIds(ids => ids.filter(value => value !== id))} />)}
      {invalidZones ? <Text style={ui.muted}>Chọn ít nhất một khu vực đang hoạt động và bỏ khu vực không còn khả dụng.</Text> : null}
    </View> : null}
    <Field label="Lý do phân công (không bắt buộc)" value={reason} onChangeText={setReason} multiline maxLength={500} editable={!busy && !disabled} />
    <Button title={assignment ? 'Cập nhật phân công' : 'Lưu phân công'} loading={busy} disabled={disabled || invalidZones} onPress={() => { if (!busy && !disabled && !invalidZones) submit({ role: user.role === 1 ? 'MANAGER' : role, accessScope: scope, zoneIds: scope === 'ALL_ZONES' ? [] : zoneIds, expectedVersion: assignment?.version ?? null, reason: reason.trim() || null }) }} />
  </View>
}
const styles = StyleSheet.create({ user: { marginTop: 14 }, zone: { minHeight: 48 } })
