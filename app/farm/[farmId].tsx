import { memo, useCallback } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { FlashList } from '@shopify/flash-list'
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { getFarm, getZones } from '../../src/api/farms'
import type { Zone } from '../../src/api/types'
import { useAuth } from '../../src/auth/AuthProvider'
import { Button, DataError, Detail, Empty, formatArea, formatDate, Heading, Icon, isActive, Loading, Screen, Status } from '../../src/ui/components'
import { colors, ui } from '../../src/ui/theme'
import { FarmMap } from '../../src/farms/FarmMap'
import { farmCoordinate } from '../../src/farms/geo'
import { FarmEditButton } from '../../src/management/FarmEditButton'

const ZoneCard = memo(function ZoneCard({ zone }: { zone: Zone }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Xem khu vực ${zone.name}`} onPress={() => router.push(`/farm/${zone.farmId}/zone/${zone.zoneId}`)} style={({ pressed }) => [styles.zone, pressed && ui.pressed]}><View style={ui.grow}><Text style={ui.kicker}>{zone.code}</Text><Text style={ui.heading}>{zone.name}</Text><Text style={ui.muted}>{formatArea(zone.areaHectares)}</Text></View><Status active={isActive(zone.status)} /><Icon name="chevron-forward" color={colors.ink} size={18} /></Pressable>
})
export default function FarmScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>()
  const { session } = useAuth()
  const farm = useQuery({ queryKey: ['farm', session?.tenant?.id, farmId], queryFn: ({ signal }) => getFarm(session!.accessToken, farmId, signal), enabled: Boolean(session) })
  const zones = useQuery({ queryKey: ['zones', session?.tenant?.id, farmId], queryFn: ({ signal }) => getZones(session!.accessToken, farmId, signal), enabled: Boolean(session) })
  const renderItem = useCallback(({ item }: { item: Zone }) => <ZoneCard zone={item} />, [])
  if (farm.isPending) return <Screen><Loading /></Screen>
  if (farm.isError) return <Screen><DataError error={farm.error} retry={() => { void farm.refetch() }} /></Screen>
  const data = farm.data
  const coordinate = farmCoordinate(data)
  return <FlashList style={ui.fill} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={ui.page} data={zones.data ?? []} keyExtractor={zone => zone.zoneId} renderItem={renderItem}
    refreshControl={<RefreshControl refreshing={farm.isRefetching || zones.isRefetching} onRefresh={() => { void farm.refetch(); void zones.refetch() }} tintColor={colors.mint} />}
    ListHeaderComponent={<View style={ui.stack}><Heading eyebrow={data.code} title={data.name} description={data.address ?? 'Thông tin nông trại và các khu vực canh tác.'} /><Status active={isActive(data.status)} />{coordinate ? <View style={styles.map}><FarmMap farms={[data]} selectedId={data.id} /></View> : null}<View><Text style={ui.heading}>Thông tin nông trại</Text><Detail label="Diện tích" value={formatArea(data.areaHectares)} /><Detail label="Ngày tạo" value={formatDate(data.createdAt)} /><Detail label="Vị trí" value={coordinate ? `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}` : 'Chưa cập nhật'} /><Detail label="Ranh giới" value={data.boundary ? 'Đã thiết lập' : 'Chưa thiết lập'} /></View>
      <FarmEditButton farm={data} />
      {session?.role === 'OWNER' ? <Button title="Đăng ký khảo sát nông trại" onPress={() => router.push({ pathname: '/surveys/request', params: { farmId } })} /> : null}
      <View style={ui.spread}><Text style={ui.heading}>Khu vực canh tác</Text><Text style={ui.muted}>{zones.data?.length ?? '—'} khu vực</Text></View>{zones.isError ? <DataError error={zones.error} retry={() => { void zones.refetch() }} /> : null}
    </View>}
    ListEmptyComponent={zones.isPending ? <Loading /> : zones.isSuccess ? <Empty icon="grid-outline" title="Chưa có khu vực" description="Các khu vực bạn có quyền truy cập sẽ xuất hiện tại đây." /> : null}
  />
}
const styles = StyleSheet.create({ zone: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 20, borderBottomWidth: 1, borderColor: colors.border }, map: { height: 230, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.water } })
