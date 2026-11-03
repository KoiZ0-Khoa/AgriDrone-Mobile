import { useRef, useState } from 'react'
import { Redirect, router } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createZone } from '../api/farms'
import { useAuth } from '../auth/AuthProvider'
import { Button, Empty, ErrorNotice, Field, Heading, Screen } from '../ui/components'
import { optionalNumber } from './validation'
import { validGuid } from '../surveys/baseMapWorkflow'

export function CreateResourceScreen({ farmId }: { farmId?: string }) {
  const { session } = useAuth(), client = useQueryClient()
  const [code, setCode] = useState(''), [name, setName] = useState(''), [area, setArea] = useState('')
  const sending = useRef(false)
  const mutation = useMutation({ mutationFn: async () => {
    if (session?.role !== 'SYSTEM_MANAGER' || !farmId || !validGuid(farmId)) throw new Error('Mở nông trại được phân công trước khi tạo khu vực.')
    if (!code.trim() || !name.trim()) throw new Error('Nhập mã và tên khu vực.')
    return createZone(session.accessToken, farmId, { code: code.trim(), name: name.trim(), areaHectares: optionalNumber(area, 'Diện tích', 0), boundary: null })
  }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['manager-farm', farmId] }); router.back() }, onSettled: () => { sending.current = false } })
  if (!farmId) return session?.role === 'OWNER' ? <Redirect href="/surveys/request" /> : <Screen><Empty title="Chủ đơn vị đăng ký nông trại mới" description="Gửi yêu cầu khảo sát để System Admin xét duyệt." /></Screen>
  if (session?.role !== 'SYSTEM_MANAGER' || !validGuid(farmId)) return <Screen><Empty icon="lock-closed-outline" title="Bạn chưa có quyền tạo khu vực" description="Chức năng dành cho System Manager phụ trách nông trại." /></Screen>
  return <Screen><Heading title="Thêm khu vực" description="Tạo khu vực trong nông trại được phân công." /><ErrorNotice error={mutation.error} />
    <Field label="Mã khu vực" value={code} onChangeText={setCode} maxLength={30} autoCapitalize="characters" editable={!mutation.isPending} />
    <Field label="Tên khu vực" value={name} onChangeText={setName} maxLength={100} editable={!mutation.isPending} />
    <Field label="Diện tích (ha, không bắt buộc)" value={area} onChangeText={setArea} keyboardType="decimal-pad" editable={!mutation.isPending} />
    <Button title="Tạo khu vực" loading={mutation.isPending} onPress={() => { if (sending.current) return; sending.current = true; mutation.mutate() }} />
  </Screen>
}
