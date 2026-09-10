import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Text, View } from 'react-native'
import { getZone } from '../../../../src/api/farms'
import { FarmManagementActions } from '../../../../src/farms/FarmManagementActions'
import { useAuth } from '../../../../src/auth/AuthProvider'
import { DataError, Detail, formatArea, formatDate, Heading, isActive, Loading, Screen, Status } from '../../../../src/ui/components'
import { ui } from '../../../../src/ui/theme'
export default function ZoneScreen() {
  const { farmId, zoneId } = useLocalSearchParams<{ farmId: string; zoneId: string }>()
  const { session } = useAuth()
  const query = useQuery({ queryKey: ['zone', session?.tenant.id, farmId, zoneId], queryFn: ({ signal }) => getZone(session!.accessToken, farmId, zoneId, signal), enabled: Boolean(session) })
  if (query.isPending) return <Screen><Loading /></Screen>
  if (query.isError) return <Screen><DataError error={query.error} retry={() => { void query.refetch() }} /></Screen>
  const zone = query.data
  return <Screen><Heading eyebrow={zone.code} title={zone.name} description="Thông tin khu vực canh tác." /><Status active={isActive(zone.status)} /><View style={ui.card}><Text style={ui.heading}>Thông tin khu vực</Text><Detail label="Diện tích" value={formatArea(zone.areaHectares)} /><Detail label="Ngày tạo" value={formatDate(zone.createdAt)} /><Detail label="Ranh giới" value={zone.boundary ? 'Đã thiết lập' : 'Chưa thiết lập'} /></View><FarmManagementActions key={`${farmId}:${zoneId}`} farmId={farmId} name={zone.name} version={zone.version} zone={zone} onArchived={() => router.replace(`/farm/${farmId}`)} /></Screen>
}
