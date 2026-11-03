import { useMutation } from '@tanstack/react-query'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../src/auth/AuthProvider'
import { roleLabels } from '../../src/auth/session'
import { Brand, Button, Detail, ErrorNotice, Icon, Screen } from '../../src/ui/components'
import { colors, fonts, ui } from '../../src/ui/theme'

export default function AccountScreen() {
  const { session, logout } = useAuth()
  const mutation = useMutation({ mutationFn: logout })
  if (!session) return null
  const initials = session.fullName.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()
  return <SafeAreaView edges={['top']} style={ui.fill}><Screen>
    <Text accessibilityRole="header" style={ui.title}>Tài khoản</Text>
    <View style={styles.profile}><View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View><Text style={ui.heading}>{session.fullName}</Text><Text style={ui.muted}>{roleLabels[session.role]}</Text></View>
    <View><Text style={ui.heading}>Thông tin cá nhân</Text><Detail label="Email" value={session.email} /><Detail label="Điện thoại" value={session.phone ?? 'Chưa cập nhật'} /></View>
    {session.tenant ? <View style={styles.workspace}><View style={ui.row}><Icon name="business-outline" color={colors.ink} /><Text style={ui.heading}>Đơn vị làm việc</Text></View><Text style={styles.tenant}>{session.tenant?.name}</Text><Text style={ui.muted}>{session.tenant?.code}</Text><Text style={ui.muted}>Để đổi đơn vị, đăng xuất và chọn đơn vị khác ở lần đăng nhập tiếp theo.</Text></View> : <View style={styles.workspace}><Text style={ui.heading}>Không gian System Manager</Text><Text style={ui.muted}>Làm việc trên các nông trại được phân công trên toàn hệ thống.</Text></View>}
    <Button title="Hồ sơ và mật khẩu" secondary icon="person-outline" onPress={() => router.push('/profile')} />
    {session.role === 'SYSTEM_MANAGER' ? <Button title="Nông trại phụ trách" secondary icon="leaf-outline" onPress={() => router.push('/farms')} /> : null}
    <ErrorNotice error={mutation.error} /><Button title="Đăng xuất" secondary icon="log-out-outline" loading={mutation.isPending} onPress={() => mutation.mutate()} />
    <View style={styles.footer}><Brand /><Text style={ui.muted}>Phiên bản 1.0.0</Text></View>
  </Screen></SafeAreaView>
}
const styles = StyleSheet.create({ profile: { alignItems: 'center', paddingVertical: 16, gap: 8 }, avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist, marginBottom: 8 }, initials: { fontFamily: fonts.bold, fontSize: 27, color: colors.ink }, workspace: { padding: 20, borderRadius: 12, backgroundColor: colors.mist, gap: 12 }, tenant: { ...ui.text, fontFamily: fonts.semibold }, footer: { alignItems: 'center', gap: 12, paddingVertical: 16 } })
