import { useState } from 'react'
import { Link } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { useAuth } from '../src/auth/AuthProvider'
import { Brand, Button, ErrorNotice, Field, Heading, Icon, Screen } from '../src/ui/components'
import { colors, ui } from '../src/ui/theme'

export default function LoginScreen() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validation, setValidation] = useState<Error | null>(null)
  const login = useMutation({ mutationFn: () => auth.login(email, password) })
  const select = useMutation({ mutationFn: auth.selectTenant })
  if (auth.selection) return <SafeAreaView style={ui.fill}><FlashList
    data={auth.selection.tenants} keyExtractor={item => item.id} contentContainerStyle={ui.page}
    ListHeaderComponent={<View style={ui.stack}><Brand /><Heading eyebrow="BƯỚC 2 / 2" title="Đơn vị làm việc" description="Chọn đơn vị bạn muốn làm việc trong phiên này." /><ErrorNotice error={select.error} /></View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" disabled={select.isPending} onPress={() => select.mutate(item.id)} style={({ pressed }) => [ui.card, ui.row, styles.tenant, pressed && ui.pressed]}><View style={ui.iconBox}><Icon name="business-outline" /></View><View style={ui.grow}><Text style={ui.heading}>{item.name}</Text><Text style={ui.muted}>{item.code}</Text></View><Icon name="chevron-forward" /></Pressable>}
    ListFooterComponent={<Button title="Quay lại đăng nhập" secondary disabled={select.isPending} onPress={() => { auth.cancelSelection(); select.reset() }} />}
  /></SafeAreaView>
  function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !password) { setValidation(new Error('Nhập email hợp lệ và mật khẩu của bạn.')); return }
    setValidation(null); login.mutate()
  }
  return <SafeAreaView style={ui.fill}><Screen><View style={styles.brand}><Brand /></View><View style={styles.intro}><Heading eyebrow="CHÀO MỪNG TRỞ LẠI" title={'Chăm vườn tốt hơn.\nTừ từng trụ cây.'} description="Đăng nhập để kết nối với nông trại của bạn." /></View><View style={ui.card}>
    <Text accessibilityRole="header" style={ui.heading}>Đăng nhập AgriDrone</Text><ErrorNotice error={validation ?? login.error} />
    <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder="ten@nongtrai.vn" editable={!login.isPending} />
    <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" placeholder="Nhập mật khẩu" editable={!login.isPending} onSubmitEditing={submit} />
    <Link href="/forgot-password" style={styles.forgot}>Quên mật khẩu?</Link><Button title="Đăng nhập" icon="arrow-forward" loading={login.isPending} onPress={submit} />
    <Link href="/invitation" style={ui.link}>Có lời mời tham gia đơn vị?</Link>
  </View><View style={styles.footer}><Text style={ui.muted}>Chưa có tài khoản?</Text><Link href="/register" style={ui.link}>Đăng ký đơn vị</Link></View><View style={styles.note}><Icon name="leaf-outline" size={16} /><Text style={ui.muted}>Hiểu từng cây. Chăm cả vườn.</Text></View></Screen></SafeAreaView>
}
const styles = StyleSheet.create({ brand: { paddingTop: 20 }, intro: { paddingVertical: 16 }, forgot: { ...ui.link, alignSelf: 'flex-end', paddingVertical: 6 }, footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }, note: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 20, borderTopWidth: 1, borderColor: colors.mist }, tenant: { marginVertical: 10 } })
