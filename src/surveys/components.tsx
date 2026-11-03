import type { PropsWithChildren } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import { Button, Empty, Icon, Screen } from '../ui/components'
import { ui } from '../ui/theme'

export function SurveyAccess({ manager = false, children }: PropsWithChildren<{ manager?: boolean }>) {
  const { session } = useAuth()
  if (session?.role !== (manager ? 'SYSTEM_MANAGER' : 'OWNER')) return <Screen><Empty icon="lock-closed-outline" title="Bạn chưa có quyền truy cập" description={manager ? 'Màn hình dành cho System Manager được phân công.' : 'Màn hình dành cho chủ đơn vị.'} /></Screen>
  return children
}
export function PageButtons({ page, hasNext, disabled, change }: { page: number; hasNext?: boolean; disabled: boolean; change: (page: number) => void }) {
  return <View style={ui.stack}><Text style={ui.muted}>Trang {page}</Text><View style={ui.row}><View style={ui.grow}><Button title="Trang trước" secondary disabled={disabled || page === 1} onPress={() => change(page - 1)} /></View><View style={ui.grow}><Button title="Trang sau" secondary disabled={disabled || !hasNext} onPress={() => change(page + 1)} /></View></View></View>
}
export function RecordCard({ title, description, note, onPress }: { title: string; description?: string; note?: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Xem ${title}`} onPress={onPress} style={({ pressed }) => [ui.card, pressed && ui.pressed]}><View style={ui.spread}><Text style={[ui.heading, ui.grow]}>{title}</Text><Icon name="chevron-forward" /></View>{description ? <Text style={ui.text}>{description}</Text> : null}{note ? <Text style={ui.muted}>{note}</Text> : null}</Pressable>
}
export const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa có'
export const readableCode = (value: string | null | undefined) => !value || /(?:[a-f0-9]{24,}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i.test(value) ? undefined : value
