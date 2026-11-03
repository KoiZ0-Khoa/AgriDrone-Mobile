import { Redirect } from 'expo-router'
import { useAuth } from '../../src/auth/AuthProvider'
import { OrdersList } from '../../src/surveys/OrdersList'
export default function WorkScreen() {
  const { session } = useAuth()
  if (session?.role === 'SYSTEM_MANAGER' || session?.role === 'OWNER') return <OrdersList manager={session.role === 'SYSTEM_MANAGER'} />
  return <Redirect href="/" />
}
