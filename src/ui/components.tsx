import Ionicons from '@expo/vector-icons/Ionicons'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewProps, type TextInputProps } from 'react-native'
import { useState, type ComponentProps, type PropsWithChildren } from 'react'
import { colors, fonts, ui } from './theme'
import { ApiError, errorMessage } from '../api/client'
import { Image } from 'expo-image'
export type IconName = ComponentProps<typeof Ionicons>['name']
export function Icon({ name, color = colors.mint, size = 22 }: { name: IconName; color?: string; size?: number }) { return <Ionicons name={name} color={color} size={size} /> }
export function Screen({ children, ...props }: PropsWithChildren<ScrollViewProps>) {
  return <KeyboardAvoidingView style={ui.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={ui.fill} contentContainerStyle={ui.page} {...props}>{children}</ScrollView></KeyboardAvoidingView>
}
export function Brand() {
  return <View style={ui.row} accessible accessibilityLabel="AgriDrone, vận hành nông trại"><Image source={require('../../assets/brand/emblem.png')} style={styles.brandEmblem} contentFit="contain" accessible={false} /><View style={styles.brandCopy}><Text style={styles.brand}><Text style={styles.brandAgri}>Agri</Text>Drone</Text><Text style={styles.brandSub}>VẬN HÀNH NÔNG TRẠI</Text></View></View>
}
export function Heading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <View style={ui.smallStack}>{eyebrow ? <Text style={ui.kicker}>{eyebrow}</Text> : null}<Text accessibilityRole="header" style={ui.title}>{title}</Text>{description ? <Text style={ui.muted}>{description}</Text> : null}</View>
}
export function Button({ title, onPress, loading, disabled, secondary, icon }: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; secondary?: boolean; icon?: IconName }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, (disabled || loading) && styles.disabled, pressed && ui.pressed]}>
    {loading ? <ActivityIndicator color={secondary ? colors.mint : colors.white} /> : icon ? <Icon name={icon} color={secondary ? colors.mint : colors.white} size={19} /> : null}<Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>
  </Pressable>
}
export function Field({ label, secureTextEntry, ...props }: TextInputProps & { label: string }) {
  const [visible, setVisible] = useState(false)
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.inputWrap}><TextInput accessibilityLabel={label} placeholderTextColor="#8b8e94" style={[styles.input, props.multiline && styles.multiline]} secureTextEntry={secureTextEntry && !visible} {...props} />{secureTextEntry ? <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} hitSlop={8} style={styles.eye} onPress={() => setVisible(!visible)}><Icon name={visible ? 'eye-off-outline' : 'eye-outline'} color={colors.muted} /></Pressable> : null}</View></View>
}
export function Notice({ title, description, error = false }: { title: string; description?: string; error?: boolean }) {
  return <View accessibilityLiveRegion="polite" style={[styles.notice, error && styles.noticeError]}><Icon name={error ? 'alert-circle-outline' : 'information-circle-outline'} color={error ? colors.danger : colors.mint} /><View style={ui.grow}><Text style={[styles.noticeTitle, error && styles.errorText]}>{title}</Text>{description ? <Text style={ui.muted}>{description}</Text> : null}</View></View>
}
export function ErrorNotice({ error }: { error: unknown }) { return error ? <Notice error title={errorMessage(error)} description={error instanceof ApiError ? [error.message !== errorMessage(error) ? error.message : null, error.code ? `Mã lỗi: ${error.code}` : null, error.traceId ? `Mã tra cứu: ${error.traceId}` : null].filter(Boolean).join('\n') : undefined} /> : null }
export function Empty({ title, description, icon = 'leaf-outline' }: { title: string; description: string; icon?: IconName }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Icon name={icon} size={30} /></View><Text style={[ui.heading, styles.center]}>{title}</Text><Text style={[ui.muted, styles.center]}>{description}</Text></View>
}
export function Loading() { return <View style={styles.empty}><ActivityIndicator color={colors.mint} /><Text style={ui.muted}>Đang tải dữ liệu…</Text></View> }
export function DataError({ error, retry }: { error: unknown; retry: () => void }) { return <View style={ui.stack}><ErrorNotice error={error} /><Button title="Thử lại" secondary onPress={retry} /></View> }
export function Status({ active }: { active: boolean }) { return <View style={[styles.status, !active && styles.inactive]}><View style={[styles.dot, !active && styles.inactiveDot]} /><Text style={[styles.statusText, !active && styles.inactiveText]}>{active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</Text></View> }
export function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={[ui.muted, ui.grow]}>{label}</Text><Text selectable style={[styles.detailValue, ui.grow]}>{value}</Text></View> }
export function ActionRow({ title, description, icon, onPress }: { title: string; description: string; icon: IconName; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [ui.card, ui.row, pressed && ui.pressed]}><View style={ui.iconBox}><Icon name={icon} /></View><View style={ui.grow}><Text style={styles.noticeTitle}>{title}</Text><Text style={ui.muted}>{description}</Text></View><Icon name="chevron-forward" size={18} color={colors.muted} /></Pressable>
}
export const isActive = (status: unknown) => status === 0 || status === 'Active' || status === 'ACTIVE'
const areaFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 })
const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' })
export const formatArea = (value: number | null) => value === null ? 'Chưa cập nhật' : `${areaFormat.format(value)} ha`
export const formatDate = (value: string) => dateFormat.format(new Date(value))
const styles = StyleSheet.create({
  brandEmblem: { width: 72, height: 48, flexShrink: 0 },
  brandCopy: { flexShrink: 1 },
  brand: { color: '#5c9e26', fontFamily: fonts.semibold, fontSize: 26, letterSpacing: -0.8 },
  brandAgri: { color: '#104f39' },
  brandSub: { color: colors.muted, fontFamily: fonts.medium, fontSize: 8, letterSpacing: 1.4, marginTop: 3 },
  button: { minHeight: 52, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: colors.ink, borderRadius: 28, borderCurve: 'continuous', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 15, textAlign: 'center' },
  secondaryText: { color: colors.mint }, disabled: { opacity: 0.45 },
  field: { gap: 8 }, label: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.white },
  input: { flex: 1, minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  multiline: { minHeight: 96, textAlignVertical: 'top' }, eye: { padding: 14 },
  notice: { flexDirection: 'row', gap: 10, padding: 16, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.mintSoft },
  noticeError: { backgroundColor: colors.dangerSoft }, noticeTitle: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22, color: colors.ink }, errorText: { color: colors.danger },
  empty: { paddingVertical: 32, paddingHorizontal: 12, alignItems: 'center', gap: 12 },
  emptyIcon: { height: 64, width: 64, borderRadius: 20, borderCurve: 'continuous', backgroundColor: colors.mintSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 6 }, center: { textAlign: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 4, borderCurve: 'continuous', backgroundColor: colors.mintSoft, alignSelf: 'flex-start' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.mint }, statusText: { fontFamily: fonts.medium, fontSize: 11, color: colors.mint },
  inactive: { backgroundColor: colors.mist }, inactiveDot: { backgroundColor: colors.muted }, inactiveText: { color: colors.muted },
  detail: { flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderColor: colors.mist, paddingVertical: 14 }, detailValue: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22, color: colors.ink, textAlign: 'right' },
})
