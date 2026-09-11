import { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Heading, Notice, Screen } from '../src/ui/components'
import { acceptAction } from '../src/management/actions'
import { ActionModal } from '../src/management/ActionModal'
export default function InvitationScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [open, setOpen] = useState(true)
  const [saved, setSaved] = useState('')
  return <Screen><Heading title="Tham gia đơn vị" description="Dùng mã từ email mời để kích hoạt quyền tham gia đơn vị." />{saved ? <Notice title={saved} /> : null}<Button title="Nhập mã lời mời" onPress={() => setOpen(true)} /><Button secondary title="Đăng nhập" onPress={() => router.replace('/login')} />{open ? <ActionModal action={acceptAction(token ?? '')} close={() => setOpen(false)} success={setSaved} /> : null}</Screen>
}
