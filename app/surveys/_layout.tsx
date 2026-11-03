import { Stack } from 'expo-router'
export default function SurveyLayout() { return <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}><Stack.Screen name="archived" options={{ title: 'Nông trại đã lưu trữ' }} /><Stack.Screen name="request" options={{ title: 'Đăng ký khảo sát' }} /><Stack.Screen name="orders/[orderId]" options={{ title: 'Đơn khảo sát & thanh toán' }} /></Stack> }
