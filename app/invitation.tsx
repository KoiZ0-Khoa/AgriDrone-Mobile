import { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Button, Field, Heading, Notice, Screen } from '../src/ui/components'
import { useAuth } from '../src/auth/AuthProvider'
import { previewInvitation } from '../src/management/api'
import { acceptAction } from '../src/management/actions'
import { ActionModal } from '../src/management/ActionModal'
export default function InvitationScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  return <InvitationContent key={token ?? ''} initialToken={token ?? ''} />
}

function InvitationContent({ initialToken }: { initialToken: string }) {
  const auth = useAuth()
  const [input, setInput] = useState(initialToken)
  const [token, setToken] = useState(initialToken.trim())
  const [open, setOpen] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const preview = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: ({ signal }) => previewInvitation(token, signal),
    enabled: Boolean(token) && !accepted,
    retry: false, gcTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false,
  })
  return <Screen><Heading title="Tham gia đơn vị" description="Dùng mã từ email mời để tham gia đơn vị." />
    {accepted ? <Notice title="Đã chấp nhận lời mời. Đăng nhập bằng tài khoản của email được mời để chọn đơn vị vừa tham gia." /> : <>
      <Field label="Mã lời mời" value={input} maxLength={512} autoCapitalize="none" autoCorrect={false} onChangeText={setInput} />
      <Button title="Kiểm tra lời mời" disabled={!input.trim()} loading={preview.isFetching} onPress={() => { const next = input.trim(); if (!next) return; setOpen(true); if (next === token) void preview.refetch(); else setToken(next) }} />
      {preview.isError ? <Notice error title={preview.error.message} /> : null}
      {preview.data && !preview.isError && !preview.isFetching && open ? <ActionModal
        key={token}
        action={acceptAction(token, preview.data, () => setAccepted(true))}
        close={() => setOpen(false)}
      /> : null}
    </>}
    <Button secondary title="Quay lại đăng nhập" onPress={() => { void auth.logout().then(() => router.replace('/login')) }} />
  </Screen>
}
