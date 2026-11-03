import { useAuth } from '../../src/auth/AuthProvider'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { colors, fonts } from '../../src/ui/theme'
export default function TabsLayout() {
  const role = useAuth().session?.role
  const manager = role === 'SYSTEM_MANAGER'
  return <NativeTabs tintColor={colors.ink} backgroundColor={colors.paper} iconColor={colors.ink} labelStyle={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.ink }} indicatorColor={colors.mintSoft} disableTransparentOnScrollEdge>
    <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Label>Trang chủ</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf="house" md="home" /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="farms" hidden={role === 'MEMBER'}><NativeTabs.Trigger.Label>{manager ? 'Phụ trách' : 'Nông trại'}</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf="leaf" md="eco" /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="work" hidden={role !== 'OWNER' && !manager}><NativeTabs.Trigger.Label>Công việc</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf="checklist" md="assignment" /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="account"><NativeTabs.Trigger.Label>Tài khoản</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" /></NativeTabs.Trigger>
  </NativeTabs>
}
