import { useState } from 'react'
import { useAuth } from '../src/auth/AuthProvider'
import { Button, Detail, Heading, Notice, Screen } from '../src/ui/components'
import { passwordAction, profileAction, type Action } from '../src/management/actions'
import { ActionModal } from '../src/management/ActionModal'
export default function ProfileScreen() {
  const { session, updateProfile, logout } = useAuth()
  const [action, setAction] = useState<Action | null>(null)
  const [saved, setSaved] = useState('')
  if (!session) return null
  return <Screen><Heading title="Hồ sơ cá nhân" description={session.email} /><Detail label="Họ và tên" value={session.fullName} /><Detail label="Điện thoại" value={session.phone ?? 'Chưa cập nhật'} />{saved ? <Notice title={saved} /> : null}
    <Button title="Chỉnh sửa hồ sơ" onPress={() => { setSaved(''); setAction(profileAction(session.accessToken, session, updateProfile)) }} />
    <Button secondary title="Đổi mật khẩu" onPress={() => { setSaved(''); setAction(passwordAction(session.accessToken, logout)) }} />
    {action ? <ActionModal action={action} close={() => setAction(null)} success={setSaved} /> : null}
  </Screen>
}
