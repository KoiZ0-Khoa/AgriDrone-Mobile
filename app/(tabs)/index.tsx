import { ManagerHome } from '../../src/surveys/ManagerHome'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../src/auth/AuthProvider'
import { useFarmCatalog } from '../../src/farms/useFarmCatalog'
import { FarmMap } from '../../src/farms/FarmMap'
import { FarmRow } from '../../src/farms/FarmRow'
import { farmCoordinate } from '../../src/farms/geo'
import { Button, DataError, Empty, Heading, Icon, Loading, Screen } from '../../src/ui/components'
import { FloatingAdd, SectionHeading, ToolbarAction } from '../../src/ui/operations'
import { colors, fonts, ui } from '../../src/ui/theme'

const dateFormat = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })
export default function HomeScreen() {
  const { session } = useAuth()
  const { query, farms, permitted, total } = useFarmCatalog()
  if (!session) return null
  if (session.role === 'SYSTEM_MANAGER') return <ManagerHome />
  if (session.role === 'MEMBER') return <SafeAreaView edges={['top']} style={ui.fill}><Screen><Heading title={`Chào ${session.fullName}`} description={session.tenant.name} /><Button title="Tài khoản của bạn" secondary icon="person-outline" onPress={() => router.push('/account')} /></Screen></SafeAreaView>
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Chào buổi sáng' : now.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
  const located = farms.filter(farm => farmCoordinate(farm))
  return <SafeAreaView edges={['top']} style={ui.fill}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { if (permitted) void query.refetch() }} tintColor={colors.mint} />}>
      <View style={styles.header}>
        <View style={ui.spread}><Text style={[ui.muted, ui.grow]}>{dateFormat.format(now)}</Text><ToolbarAction icon="person-circle-outline" label="Mở tài khoản" onPress={() => router.push('/account')} /></View>
        <Text accessibilityRole="header" style={styles.greeting}>{greeting},{'\n'}{session.fullName.trim().split(/\s+/).at(-1)}.</Text>
        <Text style={ui.muted}>{session.tenant?.name}</Text>
      </View>
      <View style={styles.mapHero}>
        <FarmMap farms={located} interactive={false} />
        <LinearGradient pointerEvents="none" colors={[colors.white, '#ffffff00']} style={styles.mapFade} />
        {permitted && query.isSuccess && located.length === 0 ? <View style={styles.mapMessage}><Icon name="location-outline" /><Text style={styles.mapMessageText}>{farms.length ? 'Nông trại chưa có vị trí trên bản đồ' : 'Bản đồ sẵn sàng cho nông trại đầu tiên'}</Text></View> : null}
        {permitted ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/farms', params: { view: 'map' } })} style={({ pressed }) => [styles.viewAll, pressed && ui.pressed]}><Text style={styles.viewAllText}>Xem bản đồ</Text><Icon name="chevron-forward" color={colors.ink} size={18} /></Pressable> : null}
      </View>
      <View style={styles.body}>
        {query.isError ? <DataError error={query.error} retry={() => { void query.refetch() }} /> : null}
        {permitted ? <View style={styles.summary}><View style={ui.grow}><Text style={styles.number}>{total ?? '—'}</Text><Text style={ui.muted}>Nông trại trong đơn vị</Text></View><View style={styles.summaryDivider} /><View style={ui.grow}><Text style={styles.number}>{query.isSuccess ? located.length : '—'}</Text><Text style={ui.muted}>Vị trí trong {farms.length} mục đã tải</Text></View></View> : null}
        {session.role === 'OWNER' ? <><SectionHeading title="Hôm nay" action="Công việc" onPress={() => router.push('/work')} /><Pressable accessibilityRole="button" onPress={() => router.push('/work')} style={({ pressed }) => [styles.today, pressed && ui.pressed]}><View style={ui.spread}><Icon name="calendar-outline" color={colors.muted} size={28} /><Icon name="arrow-forward" color={colors.ink} /></View><Text style={ui.heading}>Lịch khảo sát của bạn</Text><Text style={ui.muted}>Xem lịch hẹn và thanh toán trong Công việc.</Text></Pressable></> : null}
        <SectionHeading title="Nông trại của bạn" action={permitted ? 'Xem tất cả' : undefined} onPress={() => router.push('/farms')} />
        {permitted ? query.isPending ? <Loading /> : farms.length ? <View>{farms.slice(0, 3).map(farm => <FarmRow key={farm.id} farm={farm} />)}</View> : query.isSuccess ? <Empty title="Bắt đầu với nông trại đầu tiên" description="Chủ đơn vị đăng ký khảo sát để tạo nông trại mới." /> : null : null}
      </View>
    </ScrollView>
    {session.role === 'OWNER' ? <FloatingAdd label="Đăng ký nông trại" onPress={() => router.push('/farm/create')} /> : null}
  </SafeAreaView>
}
const styles = StyleSheet.create({
  content: { paddingBottom: 110 }, header: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  greeting: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 42, letterSpacing: -1.2, color: colors.ink },
  mapHero: { height: 340, marginTop: 12, backgroundColor: colors.water, overflow: 'hidden' }, mapFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 65 },
  mapMessage: { position: 'absolute', top: 85, alignSelf: 'center', maxWidth: '85%', borderRadius: 12, padding: 16, gap: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffffed' }, mapMessageText: { ...ui.text, flexShrink: 1, fontSize: 14 },
  viewAll: { position: 'absolute', right: 20, bottom: 30, backgroundColor: colors.white, borderRadius: 28, minHeight: 48, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(7,54,66,0.15)' }, viewAllText: { fontFamily: fonts.bold, color: colors.ink, fontSize: 16 },
  body: { padding: 20, gap: 18 }, summary: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 10, marginBottom: 4 }, summaryDivider: { width: 1, height: 44, backgroundColor: colors.border }, number: { ...ui.heading, fontSize: 30, lineHeight: 38 },
  today: { backgroundColor: colors.mist, borderRadius: 16, padding: 22, gap: 12, marginBottom: 10 },
})
