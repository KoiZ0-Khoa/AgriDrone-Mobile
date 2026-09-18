import { useCallback, useEffect, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { Farm } from '../../src/api/types'
import { useAuth } from '../../src/auth/AuthProvider'
import { useFarmCatalog } from '../../src/farms/useFarmCatalog'
import { FarmMap } from '../../src/farms/FarmMap'
import { farmCoordinate } from '../../src/farms/geo'
import { FarmRow } from '../../src/farms/FarmRow'
import { MyFarms } from '../../src/management/MyFarms'
import { Button, DataError, Empty, formatArea, Icon, isActive, Loading } from '../../src/ui/components'
import { FloatingAdd, Segments, ToolbarAction } from '../../src/ui/operations'
import { colors, fonts, ui } from '../../src/ui/theme'

const modes = [{ value: 'list', label: 'Danh sách' }, { value: 'map', label: 'Bản đồ' }] as const
const filters = [{ value: 'all', label: 'Tất cả nông trại' }, { value: 'active', label: 'Đang hoạt động' }, { value: 'inactive', label: 'Ngừng hoạt động' }] as const
export default function FarmsScreen() {
  const { session } = useAuth()
  const { query, permitted, farms, total } = useFarmCatalog()
  const params = useLocalSearchParams<{ view?: string }>()
  const [mode, setMode] = useState<'list' | 'map'>(params.view === 'map' ? 'map' : 'list')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string>()
  useEffect(() => { if (params.view === 'map' || params.view === 'list') setMode(params.view) }, [params.view])
  const needle = search.trim().toLocaleLowerCase('vi-VN')
  const visible = farms.filter(farm => (!needle || `${farm.name} ${farm.code} ${farm.address ?? ''}`.toLocaleLowerCase('vi-VN').includes(needle)) && (filter === 'all' || isActive(farm.status) === (filter === 'active')))
  const located = visible.filter(farm => farmCoordinate(farm))
  const selected = located.find(farm => farm.id === selectedId) ?? located[0]
  const renderItem = useCallback(({ item }: { item: Farm }) => <FarmRow farm={item} />, [])
  const loadMore = query.hasNextPage ? <Button title={`Tải thêm (${farms.length}/${total})`} secondary loading={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage() }} /> : null
  if (!permitted) return <SafeAreaView edges={['top']} style={ui.fill}><MyFarms /></SafeAreaView>
  return <SafeAreaView edges={['top']} style={ui.fill}>
    <View style={styles.header}>
      <View style={ui.spread}><Text accessibilityRole="header" style={[ui.title, ui.grow]}>Nông trại</Text><ToolbarAction icon="options-outline" label="Lọc nông trại" active={filter !== 'all'} onPress={() => setFilterOpen(true)} /><ToolbarAction icon="refresh-outline" label="Tải lại nông trại" onPress={() => { void query.refetch() }} /></View>
      <Text numberOfLines={1} style={ui.muted}>{session?.tenant.name}</Text>
      <View style={styles.search}><Icon name="search-outline" color={colors.muted} size={20} /><TextInput accessibilityLabel="Tìm nông trại theo tên, mã hoặc địa chỉ" value={search} onChangeText={setSearch} placeholder="Tìm tên, mã hoặc địa chỉ" placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" autoCorrect={false} />{search ? <ToolbarAction icon="close" label="Xóa tìm kiếm" onPress={() => setSearch('')} /> : null}</View>
      <Segments options={[...modes]} value={mode} onChange={value => { setMode(value); router.setParams({ view: value }) }} />
    </View>
    <View style={styles.scope}><Text style={[styles.scopeText, ui.grow]}>{filters.find(item => item.value === filter)?.label}</Text><Text style={styles.count}>{visible.length}{total !== undefined ? ` / ${total}` : ''}</Text></View>
    {query.isError && mode === 'map' ? <View style={styles.feedback}><DataError error={query.error} retry={() => { void query.refetch() }} /></View> : null}
    {mode === 'list' ? <FlashList data={visible} renderItem={renderItem} keyExtractor={farm => farm.id} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => { void query.refetch() }} tintColor={colors.mint} />}
      ListHeaderComponent={<View>{query.hasNextPage ? <Text style={styles.hint}>Tìm và lọc trong {farms.length} nông trại đã tải.</Text> : null}{query.isError ? <DataError error={query.error} retry={() => { void query.refetch() }} /> : null}</View>}
      ListEmptyComponent={query.isPending ? <Loading /> : query.isSuccess ? <Empty title={search || filter !== 'all' ? 'Không có nông trại phù hợp' : 'Chưa có nông trại'} description={search || filter !== 'all' ? 'Thử đổi từ khóa hoặc bộ lọc. Nếu còn trang dữ liệu, tải thêm để tìm tiếp.' : 'Nhấn + để tạo nông trại đầu tiên.'} /> : null}
      ListFooterComponent={<View style={styles.footer}>{loadMore}</View>} />
      : <View style={styles.mapArea}><View style={ui.grow}><FarmMap farms={located} selectedId={selected?.id} onSelect={farm => setSelectedId(farm.id)} /></View>
        <View style={styles.mapPanel}><ScrollView style={styles.panelScroll} contentContainerStyle={ui.stack} keyboardShouldPersistTaps="handled">
          <Text style={ui.muted}>{located.length} vị trí · {visible.length - located.length} nông trại chưa có tọa độ hợp lệ</Text>
          {query.isPending ? <Loading /> : selected ? <View style={styles.selection}><Text style={ui.kicker}>{selected.code}</Text><Text style={ui.heading}>{selected.name}</Text><Text style={ui.muted}>{selected.address ?? 'Chưa cập nhật địa chỉ'} · {formatArea(selected.areaHectares)}</Text><View style={ui.spread}><ToolbarAction icon="chevron-back" label="Nông trại trước" onPress={() => setSelectedId(located[(located.indexOf(selected) - 1 + located.length) % located.length].id)} /><Button title="Xem chi tiết" onPress={() => router.push(`/farm/${selected.id}`)} /><ToolbarAction icon="chevron-forward" label="Nông trại tiếp theo" onPress={() => setSelectedId(located[(located.indexOf(selected) + 1) % located.length].id)} /></View></View> : <Text style={ui.text}>Chưa có vị trí để hiển thị. Xem thông tin nông trại trong Danh sách.</Text>}
          {loadMore}
        </ScrollView></View>
      </View>}
    {mode === 'list' ? <FloatingAdd label="Thêm nông trại" onPress={() => router.push('/farm/create')} /> : null}
    <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
      <View style={styles.modal}><Pressable accessibilityRole="button" accessibilityLabel="Đóng bộ lọc" style={StyleSheet.absoluteFill} onPress={() => setFilterOpen(false)} /><SafeAreaView edges={['bottom']} accessibilityViewIsModal style={styles.sheet}><View style={styles.handle} /><View style={ui.spread}><Text style={ui.heading}>Hiển thị nông trại</Text><ToolbarAction icon="close" label="Đóng bộ lọc" onPress={() => setFilterOpen(false)} /></View>{filters.map(item => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: filter === item.value }} onPress={() => { setFilter(item.value); setFilterOpen(false) }} style={styles.filterRow}><Text style={ui.text}>{item.label}</Text><Icon name={filter === item.value ? 'radio-button-on' : 'radio-button-off'} color={filter === item.value ? colors.mint : colors.muted} /></Pressable>)}</SafeAreaView></View>
    </Modal>
  </SafeAreaView>
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18, gap: 12 }, search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingLeft: 14, gap: 8 }, searchInput: { ...ui.text, flex: 1, minHeight: 46, paddingVertical: 10, paddingRight: 10 },
  scope: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }, scopeText: { ...ui.text, fontFamily: fonts.semibold }, count: { ...ui.text, backgroundColor: colors.mist, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3 },
  list: { paddingHorizontal: 20, paddingBottom: 104, backgroundColor: colors.paper }, hint: { ...ui.muted, fontSize: 12, paddingTop: 14 }, footer: { paddingTop: 20 }, feedback: { padding: 14 },
  mapArea: { flex: 1, minHeight: 300, backgroundColor: colors.water }, mapPanel: { backgroundColor: colors.white, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: '0 -3px 16px rgba(7,54,66,0.1)', maxHeight: '48%' }, panelScroll: { flexGrow: 0 }, selection: { gap: 6 },
  modal: { flex: 1, backgroundColor: '#07364266', justifyContent: 'flex-end' }, sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 }, handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center' }, filterRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.border },
})
