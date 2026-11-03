import { useState } from 'react'
import { View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import type { FarmDetail } from '../api/types'
import { Button, Notice } from '../ui/components'
import { farmAction, type Action } from './actions'
import { ActionModal } from './ActionModal'
export function FarmEditButton({ farm }: { farm: FarmDetail }) {
  const { session } = useAuth()
  const [action, setAction] = useState<Action | null>(null)
  const [saved, setSaved] = useState('')
  if (!session || session.role !== 'SYSTEM_MANAGER') return null
  return <View>{saved ? <Notice title={saved} /> : null}<Button secondary title="Chỉnh sửa nông trại" icon="create-outline" onPress={() => { setSaved(''); setAction(farmAction(session.accessToken, farm.id, { ...farm, expectedVersion: farm.version })) }} />{action ? <ActionModal action={action} close={() => setAction(null)} success={setSaved} /> : null}</View>
}
