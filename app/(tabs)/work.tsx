import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Icon, Screen } from '../../src/ui/components'
import { SectionHeading } from '../../src/ui/operations'
import { colors, fonts, ui } from '../../src/ui/theme'

const dateFormat = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })
export default function WorkScreen() {
  return <SafeAreaView edges={['top']} style={ui.fill}><Screen>
    <View style={ui.smallStack}><Text style={ui.muted}>{dateFormat.format(new Date())}</Text><Text accessibilityRole="header" style={ui.title}>Công việc</Text></View>
    <View style={styles.availability}><View style={ui.row}><View style={styles.dot} /><Text style={styles.availabilityText}>Lịch hiện trường · Sắp có</Text></View></View>
    <View style={styles.empty}><View style={styles.calendar}><Icon name="calendar-outline" color={colors.ink} size={42} /></View><Text style={[ui.heading, styles.center]}>Một nơi cho ngày làm việc</Text><Text style={[ui.muted, styles.center]}>Lịch phân công chưa khả dụng trong phiên bản này. Khi được mở, công việc sẽ được tổ chức theo ngày và khu vực bạn phụ trách.</Text></View>
    <SectionHeading title="Công việc ngoài vườn" />
    <View style={styles.workflow}><View style={styles.number}><Text style={styles.numberText}>01</Text></View><View style={ui.grow}><Text style={ui.heading}>Xác minh cây trồng</Text><Text style={ui.muted}>Đến đúng trụ cây, kiểm tra hiện trạng và bổ sung ảnh thực tế.</Text><Text style={styles.soon}>Sắp có</Text></View></View>
    <View style={styles.workflow}><View style={styles.number}><Text style={styles.numberText}>02</Text></View><View style={ui.grow}><Text style={ui.heading}>Ghi nhận thu hoạch</Text><Text style={ui.muted}>Ghi số quả, khối lượng và chất lượng tại khu vực được giao.</Text><Text style={styles.soon}>Sắp có</Text></View></View>
    <Button title="Xem nông trại" secondary icon="leaf-outline" onPress={() => router.push('/farms')} />
    <View style={styles.connection}><Icon name="cloud-outline" color={colors.muted} size={18} /><Text style={[ui.muted, ui.grow]}>Hiện tại ứng dụng cần kết nối mạng. Ghi nhận ngoại tuyến sẽ được bổ sung sau.</Text></View>
  </Screen></SafeAreaView>
}
const styles = StyleSheet.create({ availability: { backgroundColor: colors.mist, borderRadius: 10, padding: 14 }, availabilityText: { ...ui.text, fontFamily: fonts.medium, fontSize: 14 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted }, empty: { paddingVertical: 26, alignItems: 'center', gap: 14 }, calendar: { width: 84, height: 84, borderRadius: 24, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' }, center: { textAlign: 'center' }, workflow: { flexDirection: 'row', gap: 16, paddingBottom: 22, borderBottomWidth: 1, borderColor: colors.border }, number: { paddingTop: 3 }, numberText: { fontFamily: fonts.bold, color: colors.muted, fontSize: 14 }, soon: { ...ui.muted, fontSize: 12, marginTop: 8 }, connection: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' } })
