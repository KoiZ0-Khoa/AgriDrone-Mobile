import { memo } from 'react'
import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Farm } from '../api/types'
import { formatArea, Icon, isActive } from '../ui/components'
import { colors, fonts, ui } from '../ui/theme'

export const FarmRow = memo(function FarmRow({ farm }: { farm: Farm }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Xem nông trại ${farm.name}`} onPress={() => router.push(`/farm/${farm.id}`)} style={({ pressed }) => [styles.row, pressed && ui.pressed]}>
    <View style={[styles.bar, !isActive(farm.status) && styles.inactive]} />
    <View style={ui.grow}><Text style={styles.code}>{farm.code} · {isActive(farm.status) ? 'Đang hoạt động' : 'Ngừng hoạt động'}</Text><Text style={ui.heading}>{farm.name}</Text><Text numberOfLines={2} style={ui.muted}>{farm.address ?? 'Chưa cập nhật địa chỉ'}</Text><Text style={styles.area}>{formatArea(farm.areaHectares)}</Text></View>
    <Icon name="chevron-forward" color={colors.ink} size={20} />
  </Pressable>
})
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 20, borderBottomWidth: 1, borderColor: colors.border }, bar: { width: 4, alignSelf: 'stretch', backgroundColor: colors.mint, borderRadius: 3 }, inactive: { backgroundColor: colors.muted }, code: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginBottom: 4 }, area: { ...ui.text, fontFamily: fonts.medium, fontSize: 13, marginTop: 8 } })
