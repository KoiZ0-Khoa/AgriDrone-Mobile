import type { ExpoConfig } from 'expo/config'

const production = process.env.APP_VARIANT === 'production'
if (production && !process.env.EXPO_PUBLIC_API_URL?.startsWith('https://')) {
  throw new Error('Production builds require EXPO_PUBLIC_API_URL pointing to the HTTPS backend.')
}
const config: ExpoConfig = {
  name: 'AgriDrone', slug: 'agridrone-mobile', scheme: 'agridrone', version: '1.0.0',
  orientation: 'portrait', userInterfaceStyle: 'light',
  extra: { androidMapsConfigured: Boolean(process.env.GOOGLE_MAPS_ANDROID_API_KEY) },
  icon: './assets/agridrone-icon.png',
  ios: {
    supportsTablet: true, bundleIdentifier: 'com.agridrone.mobile',
    infoPlist: production ? {} : { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } },
  },
  android: {
    package: 'com.agridrone.mobile',
    adaptiveIcon: { foregroundImage: './assets/agridrone-foreground.png', backgroundColor: '#ffffff' },
  },
  web: { bundler: 'metro', output: 'single', favicon: './assets/brand/favicon.png' },
  plugins: [
    'expo-router', 'expo-secure-store',
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }],
    ['expo-font', { fonts: [
      './node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
      './node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
      './node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
      './node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
    ] }],
    ['expo-splash-screen', { backgroundColor: '#ffffff', image: './assets/brand/emblem.png', imageWidth: 180 }],
    ['expo-build-properties', { android: { usesCleartextTraffic: !production } }],
  ],
}
export default config
