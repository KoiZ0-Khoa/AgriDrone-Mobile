import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Icon, type IconName } from './components'
import { colors, fonts, ui } from './theme'

export function ToolbarAction({ icon, label, onPress, active = false }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.tool, active && styles.activeTool, pressed && ui.pressed]}><Icon name={icon} color={active ? colors.mint : colors.ink} size={24} /></Pressable>
}
export function Segments<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <View accessibilityRole="tablist" style={styles.segments}>{options.map(option => <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected: option.value === value }} onPress={() => onChange(option.value)} style={({ pressed }) => [styles.segment, option.value === value && styles.selected, pressed && ui.pressed]}><Text style={[styles.segmentText, option.value === value && styles.selectedText]}>{option.label}</Text></Pressable>)}</View>
}
export function FloatingAdd({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.fab, pressed && ui.pressed]}><Icon name="add" color={colors.white} size={32} /></Pressable>
}
export function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={ui.spread}><Text accessibilityRole="header" style={[ui.heading, ui.grow]}>{title}</Text>{action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={styles.sectionAction}><Text style={ui.link}>{action}</Text><Icon name="chevron-forward" size={16} /></Pressable> : null}</View>
}
const styles = StyleSheet.create({
  tool: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23 }, activeTool: { backgroundColor: colors.mintSoft },
  segments: { flexDirection: 'row', backgroundColor: colors.mist, borderRadius: 12, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingHorizontal: 8 },
  selected: { backgroundColor: colors.white, boxShadow: '0 2px 5px rgba(7,54,66,0.12)' },
  segmentText: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink }, selectedText: { fontFamily: fonts.semibold },
  fab: { position: 'absolute', right: 22, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(7,54,66,0.22)' },
  sectionAction: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 4 },
})
