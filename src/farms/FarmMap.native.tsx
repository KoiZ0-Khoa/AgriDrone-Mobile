import { useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import Constants from 'expo-constants'
import MapView, { Marker } from 'react-native-maps'
import { farmCoordinate, type FarmMapProps } from './geo'
import { colors, ui } from '../ui/theme'
import { Icon } from '../ui/components'

const mapStyle = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#edf1e8' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c8e9ed' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
]
export function FarmMap(props: FarmMapProps) {
  if (Platform.OS === 'android' && Constants.executionEnvironment !== 'storeClient' && !Constants.expoConfig?.extra?.androidMapsConfigured) {
    return <View style={styles.unavailable}><Icon name="map-outline" size={36} /><Text style={ui.heading}>Bản đồ chưa khả dụng</Text><Text style={[ui.muted, styles.center]}>Bản cài đặt này chưa hỗ trợ bản đồ. Bạn vẫn có thể xem thông tin nông trại từ danh sách.</Text></View>
  }
  return <NativeFarmMap {...props} />
}
function NativeFarmMap({ farms, selectedId, onSelect, interactive = true }: FarmMapProps) {
  const map = useRef<MapView>(null)
  const [ready, setReady] = useState(false)
  // A stable coordinate signature avoids refitting when unrelated query state changes.
  const coordinatesKey = JSON.stringify(farms.map(farmCoordinate).filter(point => point !== null))
  useEffect(() => {
    if (!ready) return
    const coordinates = JSON.parse(coordinatesKey) as { latitude: number; longitude: number }[]
    if (coordinates.length === 1) map.current?.animateToRegion({ ...coordinates[0], latitudeDelta: 0.035, longitudeDelta: 0.035 }, 300)
    else if (coordinates.length > 1) map.current?.fitToCoordinates(coordinates, { edgePadding: { top: 64, right: 48, bottom: 64, left: 48 }, animated: true })
  }, [ready, coordinatesKey])
  const selected = farms.find(farm => farm.id === selectedId)
  const point = selected ? farmCoordinate(selected) : null
  useEffect(() => {
    if (ready && point) map.current?.animateToRegion({ ...point, latitudeDelta: 0.035, longitudeDelta: 0.035 }, 300)
  }, [ready, point?.latitude, point?.longitude])
  return <MapView ref={map} style={StyleSheet.absoluteFill} onMapReady={() => setReady(true)} initialRegion={{ latitude: 16.1, longitude: 107.8, latitudeDelta: 15, longitudeDelta: 15 }} customMapStyle={mapStyle} userInterfaceStyle="light" showsPointsOfInterests={false} showsCompass={interactive} scrollEnabled={interactive} zoomEnabled={interactive} rotateEnabled={false} pitchEnabled={false} toolbarEnabled={false}>
    {farms.map(farm => { const coordinate = farmCoordinate(farm); return coordinate ? <Marker key={farm.id} coordinate={coordinate} title={farm.name} description={farm.address ?? farm.code} pinColor={farm.id === selectedId ? colors.ink : colors.mint} onPress={() => onSelect?.(farm)} /> : null })}
  </MapView>
}
const styles = StyleSheet.create({ unavailable: { flex: 1, backgroundColor: colors.water, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 12 }, center: { textAlign: 'center' } })
