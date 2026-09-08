import { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { request } from '../src/api/client'
import { Button, ErrorNotice, Field, Heading, Notice, Screen } from '../src/ui/components'
export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>()
  const [token, setToken] = useState(params.token ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [validation, setValidation] = useState<Error | null>(null)
  const mutation = useMutation({ mutationFn: () => request('/api/auth/reset-password', { method: 'POST', body: { token: token.trim(), newPassword: password, confirmPassword: confirm } }) })
  return <Screen><Heading eyebrow="BẢO VỆ TÀI KHOẢN" title="Mật khẩu mới" description="Dùng mã trong liên kết được gửi qua email để đặt lại mật khẩu." />
    {mutation.isSuccess ? <><Notice title="Đã cập nhật mật khẩu" /><Button title="Đăng nhập" onPress={() => router.replace('/login')} /></> : <><ErrorNotice error={validation ?? mutation.error} />
      <Field label="Mã đặt lại mật khẩu" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} />
      <Field label="Mật khẩu mới" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Field label="Xác nhận mật khẩu" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
      <Button title="Lưu mật khẩu mới" loading={mutation.isPending} onPress={() => { if (!token.trim() || password.length < 8 || password !== confirm) { setValidation(new Error('Nhập mã hợp lệ và mật khẩu ít nhất 8 ký tự, trùng khớp với xác nhận.')); return }; setValidation(null); mutation.mutate() }} />
    </>}
  </Screen>
}
