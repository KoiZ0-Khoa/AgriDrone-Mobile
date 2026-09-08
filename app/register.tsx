import { useState } from 'react'
import { router } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { request } from '../src/api/client'
import { Button, ErrorNotice, Field, Heading, Notice, Screen } from '../src/ui/components'

export default function RegisterScreen() {
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', tenantCode: '', tenantName: '', password: '', confirmPassword: '' })
  const [validation, setValidation] = useState<Error | null>(null)
  const mutation = useMutation({ mutationFn: () => request('/api/auth/register', { method: 'POST', body: { fullName: form.fullName.trim(), phone: form.phone.trim(), email: form.email.trim(), tenantCode: form.tenantCode.trim(), tenantName: form.tenantName.trim(), password: form.password } }) })
  const change = (key: keyof typeof form) => (value: string) => setForm(current => ({ ...current, [key]: value }))
  function submit() {
    if (Object.values(form).some(value => !value.trim())) { setValidation(new Error('Vui lòng điền đầy đủ thông tin.')); return }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setValidation(new Error('Email chưa đúng định dạng.')); return }
    if (form.password.length < 8 || form.password !== form.confirmPassword) { setValidation(new Error('Mật khẩu cần ít nhất 8 ký tự và xác nhận phải trùng khớp.')); return }
    setValidation(null); mutation.mutate()
  }
  return <Screen><Heading eyebrow="BẮT ĐẦU HÀNH TRÌNH" title={'Một đơn vị.\nNhiều mùa xanh.'} description="Tạo tài khoản chủ sở hữu và đơn vị nông nghiệp của bạn." />
    {mutation.isSuccess ? <><Notice title="Đăng ký thành công" description="Tài khoản và đơn vị đã được tạo. Bạn có thể đăng nhập ngay." /><Button title="Đi đến đăng nhập" onPress={() => router.replace('/login')} /></> : <>
      <ErrorNotice error={validation ?? mutation.error} />
      <Field label="Họ và tên" value={form.fullName} onChangeText={change('fullName')} maxLength={150} autoComplete="name" />
      <Field label="Số điện thoại" value={form.phone} onChangeText={change('phone')} maxLength={11} keyboardType="phone-pad" autoComplete="tel" />
      <Field label="Email" value={form.email} onChangeText={change('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Mã đơn vị" value={form.tenantCode} onChangeText={change('tenantCode')} maxLength={30} autoCapitalize="characters" placeholder="VD: ANPHU" />
      <Field label="Tên đơn vị" value={form.tenantName} onChangeText={change('tenantName')} maxLength={150} placeholder="Nông trại An Phú" />
      <Field label="Mật khẩu" value={form.password} onChangeText={change('password')} secureTextEntry autoComplete="new-password" />
      <Field label="Xác nhận mật khẩu" value={form.confirmPassword} onChangeText={change('confirmPassword')} secureTextEntry autoComplete="new-password" />
      <Button title="Tạo tài khoản" loading={mutation.isPending} onPress={submit} />
    </>}
  </Screen>
}
