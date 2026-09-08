import { StyleSheet } from 'react-native'
export const colors = { mint: '#388329', mintSoft: '#edf4e8', ink: '#073642', muted: '#617b81', border: '#dce1df', mist: '#f1f0e9', white: '#ffffff', paper: '#faf9f6', water: '#d8eef0', danger: '#b42318', dangerSoft: '#fff2f0' }
export const fonts = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' }
export const ui = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.white },
  page: { padding: 20, paddingBottom: 40, gap: 24, width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { fontFamily: fonts.bold, color: colors.ink, fontSize: 32, letterSpacing: -1, lineHeight: 40 },
  heading: { fontFamily: fonts.bold, color: colors.ink, fontSize: 20, letterSpacing: -0.5, lineHeight: 28 },
  text: { fontFamily: fonts.regular, color: colors.ink, fontSize: 15, lineHeight: 23 },
  muted: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14, lineHeight: 22 },
  kicker: { fontFamily: fonts.semibold, color: colors.mint, fontSize: 11, letterSpacing: 1.8, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stack: { gap: 16 },
  smallStack: { gap: 6 },
  grow: { flex: 1 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, borderCurve: 'continuous', padding: 20, gap: 16 },
  divider: { height: 1, backgroundColor: colors.mist },
  link: { color: colors.mint, fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
  iconBox: { height: 46, width: 46, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.mintSoft, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
})
