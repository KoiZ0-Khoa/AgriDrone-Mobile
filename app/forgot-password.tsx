import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'expo-router'
import { request } from '../src/api/client'
import { Button, ErrorNotice, Field, Heading, Notice, Screen } from '../src/ui/components'
import { ui } from '../src/ui/theme'
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [validation, setValidation] = useState<Error | null>(null)
  const mutation = useMutation({ mutationFn: () => request('/api/auth/forgot-password', { method: 'POST', body: { email: email.trim() } }) })
  return <Screen><Heading eyebrow="KHÔI PHỤC TÀI KHOẢN" title="Quên mật khẩu?" description="Nhập email để nhận liên kết đặt lại mật khẩu." />
    {mutation.isSuccess ? <Notice title="Kiểm tra hộp thư của bạn" description="Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi đến email này." /> : <><ErrorNotice error={validation ?? mutation.error} /><Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /><Button title="Gửi hướng dẫn" loading={mutation.isPending} onPress={() => { if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setValidation(new Error('Nhập email hợp lệ.')); return }; setValidation(null); mutation.mutate() }} /></>}
    <Link href="/reset-password" style={ui.link}>Tôi đã có mã đặt lại mật khẩu</Link>
  </Screen>
}
