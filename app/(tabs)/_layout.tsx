import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { colors, fonts } from '../../src/ui/theme'
export default function TabsLayout() {
  return <NativeTabs tintColor={colors.ink} backgroundColor={colors.paper} iconColor={colors.ink} labelStyle={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.ink }} indicatorColor={colors.mintSoft} disableTransparentOnScrollEdge>
    <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Label>Trang chủ</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf="house" md="home" /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="farms"><NativeTabs.Trigger.Label>Nông trại</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf="leaf" md="eco" /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="work"><NativeTabs.Trigger.Label>Công việc</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf="checklist" md="assignment" /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="account"><NativeTabs.Trigger.Label>Tài khoản</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" /></NativeTabs.Trigger>
  </NativeTabs>
}
