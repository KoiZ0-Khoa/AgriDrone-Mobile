import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../src/auth/AuthProvider'
import { colors, fonts } from '../src/ui/theme'
import { DataError, Loading, Screen } from '../src/ui/components'
import * as SplashScreen from 'expo-splash-screen'

void SplashScreen.preventAutoHideAsync().catch(() => {})
export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } } }))
  // Bundled font loading also supports Expo Go and web previews; native builds embed these via the config plugin.
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold })
  useEffect(() => { if (loaded || error) void SplashScreen.hideAsync() }, [loaded, error])
  if (!loaded && !error) return null
  return <QueryClientProvider client={queryClient}><AuthProvider><StatusBar style="dark" /><Navigation /></AuthProvider></QueryClientProvider>
}
function Navigation() {
  const { session, ready } = useAuth()
  if (!ready) return <Screen><Loading /></Screen>
  return <Stack screenOptions={{ contentStyle: { backgroundColor: colors.white }, headerTintColor: colors.ink, headerShadowVisible: false, headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17 }, headerBackButtonDisplayMode: 'minimal' }}>
    <Stack.Protected guard={!session}>
      <Stack.Screen name="login" options={{ title: '', headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Đăng ký khảo sát' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Khôi phục tài khoản' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Đặt lại mật khẩu' }} />
    </Stack.Protected>
    <Stack.Protected guard={Boolean(session)}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'Hồ sơ cá nhân' }} />
    </Stack.Protected>
    <Stack.Protected guard={Boolean(session?.tenant)}>
      <Stack.Screen name="farm/[farmId]" options={{ title: 'Nông trại' }} />
      <Stack.Screen name="farm/create" options={{ title: 'Đăng ký nông trại', presentation: 'modal' }} />
      <Stack.Screen name="farm/[farmId]/create-zone" options={{ title: 'Thêm khu vực', presentation: 'modal' }} />
      <Stack.Screen name="farm/[farmId]/zone/[zoneId]" options={{ title: 'Khu vực canh tác' }} />
    </Stack.Protected>
    <Stack.Protected guard={session?.role === 'SYSTEM_MANAGER'}><Stack.Screen name="manager" options={{ headerShown: false }} /></Stack.Protected>
    <Stack.Protected guard={session?.role === 'OWNER'}><Stack.Screen name="surveys" options={{ headerShown: false }} /></Stack.Protected>
    <Stack.Screen name="invitation" options={{ title: 'Tham gia đơn vị' }} />
  </Stack>
}
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) { return <Screen><DataError error={error} retry={retry} /></Screen> }
