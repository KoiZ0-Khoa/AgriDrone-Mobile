import { StyleSheet, Text, View } from 'react-native'
import { Icon } from '../ui/components'
import { colors, ui } from '../ui/theme'
import type { FarmMapProps } from './geo'

// Web preview fallback: native map libraries cannot be imported into the web bundle.
export function FarmMap(_props: FarmMapProps) {
  return <View style={styles.placeholder}><Icon name="map-outline" size={42} /><Text style={ui.heading}>Không gian nông trại</Text><Text style={[ui.muted, styles.text]}>Mở trên điện thoại để xem bản đồ tương tác. Bạn vẫn có thể chọn nông trại từ danh sách.</Text></View>
}
const styles = StyleSheet.create({ placeholder: { flex: 1, backgroundColor: colors.water, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 }, text: { textAlign: 'center', maxWidth: 320 } })
