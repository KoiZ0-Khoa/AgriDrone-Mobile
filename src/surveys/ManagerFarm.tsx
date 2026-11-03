import { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshControl, Text, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import { Button, DataError, Detail, Empty, Heading, Loading, Screen, formatArea, isActive } from '../ui/components'
import { ui } from '../ui/theme'
import { getAssignedFarms } from './api'
import { getFarmContext } from './farmApi'
import { readableCode, SurveyAccess } from './components'
import { FarmEditButton } from '../management/FarmEditButton'
import { ActionModal } from '../management/ActionModal'
import { text, type Action } from '../management/actions'
import { archiveFarm, archiveZone, updateZone } from '../api/farms'
import { validGuid } from './baseMapWorkflow'
import { intakeOptionalArea } from './intakeNumbers'

export function ManagerFarm() {
  const { farmId = '' } = useLocalSearchParams<{ farmId: string }>()
  return <SurveyAccess manager>{validGuid(farmId) ? <Farm farmId={farmId} /> : <Screen><Empty title="Liên kết không hợp lệ" description="Mở nông trại từ danh sách được phân công." /></Screen>}</SurveyAccess>
}
function Farm({ farmId }: { farmId: string }) {
  const session = useAuth().session!, token = session.accessToken
  const client = useQueryClient()
  const [action, setAction] = useState<Action | null>(null)
  const assigned = useQuery({ queryKey: ['manager-farms'], queryFn: ({ signal }) => getAssignedFarms(token, signal) })
  const assignment = assigned.data?.find(item => item.farmId.toLowerCase() === farmId.toLowerCase())
  const query = useQuery({ queryKey: ['manager-farm', farmId], queryFn: ({ signal }) => getFarmContext(token, farmId, signal), enabled: !!assignment })
  const refresh = () => { void assigned.refetch(); void query.refetch() }
  if (assigned.isPending) return <Screen><Loading /></Screen>
  if (assigned.isError) return <Screen><DataError error={assigned.error} retry={refresh} /></Screen>
  if (!assignment) return <Screen><Empty title="Nông trại chưa được phân công" description="Bạn chỉ có thể mở nông trại thuộc phân công hiện tại." /></Screen>
  if (query.isPending) return <Screen><Loading /></Screen>
  if (query.isError) return <Screen><DataError error={query.error} retry={refresh} /></Screen>
  const farm = query.data
  if (farm.farmId.toLowerCase() !== farmId.toLowerCase() || farm.tenantId !== assignment.tenantId) return <Screen><Empty title="Thông tin không khớp phân công" description="Tải lại danh sách nông trại trước khi tiếp tục." /></Screen>
  const active = isActive(farm.status), busy = query.isFetching || assigned.isFetching
  const after = async () => { await client.invalidateQueries({ queryKey: ['manager-farm', farmId] }); await client.invalidateQueries({ queryKey: ['manager-farms'] }) }
  return <Screen refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} />}>
    <Heading eyebrow={readableCode(farm.code)} title={farm.name} description={farm.address ?? 'Chưa cập nhật địa chỉ'} />
    <View style={ui.card}><Text style={ui.heading}>Thông tin nông trại</Text><Detail label="Diện tích" value={formatArea(farm.areaHectares)} /><Detail label="Kinh độ" value={farm.centerPoint?.coordinates[0]?.toString() ?? 'Chưa cập nhật'} /><Detail label="Vĩ độ" value={farm.centerPoint?.coordinates[1]?.toString() ?? 'Chưa cập nhật'} /><Detail label="Ranh giới" value={farm.approvedBoundary ? `Đã duyệt · phiên bản ${farm.approvedBoundary.versionNumber}` : 'Chưa xác minh'} /></View>
    {active && !busy && farm.centerPoint !== undefined ? <FarmEditButton farm={{ ...farm, id: farm.farmId, centerPoint: farm.centerPoint, boundary: farm.approvedBoundary?.geometry ?? null, createdAt: '', updatedAt: null }} /> : null}
    <Button title="Duyệt bản đồ nền" icon="map-outline" onPress={() => router.push(`/manager/farms/${farmId}/base-map`)} />
    <Text style={ui.heading}>Khu vực canh tác</Text>
    {active ? <Button title="Thêm khu vực" disabled={busy} onPress={() => router.push(`/manager/farms/${farmId}/create-zone`)} /> : null}
    {farm.zones.map(zone => <View key={zone.id} style={ui.card}><Text style={ui.heading}>{zone.name}</Text><Text style={ui.muted}>{formatArea(zone.areaHectares)}</Text>{active && isActive(zone.status) ? <><Button secondary title="Sửa khu vực" disabled={busy} onPress={() => setAction({ title: `Chỉnh sửa ${zone.name}`, fields: [{ key: 'name', label: 'Tên khu vực', value: zone.name, max: 100 }, { key: 'area', label: 'Diện tích (ha)', value: zone.areaHectares?.toString() ?? '', kind: 'number', optional: true }], run: v => updateZone(token, farmId, zone.id, { name: text(v, 'name'), areaHectares: intakeOptionalArea(v.area), boundary: zone.boundary, expectedVersion: zone.version }), after })} /><Button secondary title="Lưu trữ khu vực" disabled={busy} onPress={() => setAction({ title: `Lưu trữ ${zone.name}`, fields: [{ key: 'reason', label: 'Lý do', max: 500 }], danger: true, run: v => archiveZone(token, farmId, zone.id, { expectedVersion: zone.version, reason: text(v, 'reason') }), after })} /></> : null}</View>)}
    {!farm.zones.length ? <Text style={ui.muted}>Chưa có khu vực canh tác.</Text> : null}
    {active ? <Button secondary title="Lưu trữ nông trại" disabled={busy} onPress={() => setAction({ title: 'Lưu trữ nông trại', description: 'Cần xử lý các khu vực và công việc còn mở trước. Lịch sử được giữ lại.', fields: [{ key: 'reason', label: 'Lý do', max: 500 }], danger: true, run: v => archiveFarm(token, farmId, { expectedVersion: farm.version, reason: text(v, 'reason') }), after: async () => { await after(); router.replace('/farms') } })} /> : null}
    {action ? <ActionModal action={action} close={() => setAction(null)} /> : null}
  </Screen>
}
