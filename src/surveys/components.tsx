import type { PropsWithChildren } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import { Button, Empty, Icon, Screen } from '../ui/components'
import { colors, fonts, ui } from '../ui/theme'

export function SurveyAccess({ manager = false, children }: PropsWithChildren<{ manager?: boolean }>) {
  const { session } = useAuth()
  if (session?.role !== (manager ? 'SYSTEM_MANAGER' : 'OWNER')) return <Screen><Empty icon="lock-closed-outline" title="Bạn chưa có quyền truy cập" description={manager ? 'Màn hình dành cho System Manager được phân công.' : 'Màn hình dành cho chủ đơn vị.'} /></Screen>
  return children
}
export function PageButtons({ page, hasNext, disabled, change }: { page: number; hasNext?: boolean; disabled: boolean; change: (page: number) => void }) {
  if (page === 1 && !hasNext) return null
  return <View style={ui.stack}><Text style={ui.muted}>Trang {page}</Text><View style={ui.row}><View style={ui.grow}><Button title="Trang trước" secondary disabled={disabled || page === 1} onPress={() => change(page - 1)} /></View><View style={ui.grow}><Button title="Trang sau" secondary disabled={disabled || !hasNext} onPress={() => change(page + 1)} /></View></View></View>
}
export function OrderStatus({ label }: { label: string }) {
  return <View style={styles.status}><Text style={styles.statusText}>{label}</Text></View>
}
export function RecordCard({ title, description, note, status, onPress }: { title: string; description?: string; note?: string; status?: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={[title, description, status, note].filter(Boolean).join(', ')} onPress={onPress} style={({ pressed }) => [ui.card, styles.record, pressed && ui.pressed]}>
    <View style={[ui.grow, ui.smallStack]}>
      <Text style={ui.heading}>{title}</Text>
      {description ? <Text style={ui.muted}>{description}</Text> : null}
      {status ? <OrderStatus label={status} /> : null}
      {note ? <Text style={ui.muted}>{note}</Text> : null}
    </View>
    <Icon name="chevron-forward" color={colors.muted} size={18} />
  </Pressable>
}
const surveyDateTime = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const dateTime = (value: string | null | undefined) => {
  const timestamp = value ? Date.parse(value) : NaN
  return Number.isFinite(timestamp) ? surveyDateTime.format(timestamp) : 'Chưa có'
}
export const readableCode = (value: string | null | undefined) => !value || /(?:[a-f0-9]{24,}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i.test(value) ? undefined : value

const styles = StyleSheet.create({
  record: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  status: { alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: colors.mintSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
})
