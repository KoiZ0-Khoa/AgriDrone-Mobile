import { useState } from 'react'
import { router } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFarm, createZone } from '../api/farms'
import { useAuth } from '../auth/AuthProvider'
import { canManageFarms } from '../auth/session'
import { Button, Empty, ErrorNotice, Field, Heading, Screen } from '../ui/components'
import { optionalNumber } from './validation'

export function CreateResourceScreen({ farmId }: { farmId?: string }) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [longitude, setLongitude] = useState('')
  const [latitude, setLatitude] = useState('')
  const [validation, setValidation] = useState<Error | null>(null)
  const mutation = useMutation({
    mutationFn: async () => {
      const common = { code: code.trim(), name: name.trim(), areaHectares: optionalNumber(area, 'Diện tích', 0), boundary: null }
      if (farmId) return createZone(session!.accessToken, farmId, common)
      const lng = optionalNumber(longitude, 'Kinh độ', -180, 180)
      const lat = optionalNumber(latitude, 'Vĩ độ', -90, 90)
      return createFarm(session!.accessToken, { ...common, address: address.trim() || null, centerPoint: lng !== null && lat !== null ? { type: 'Point', coordinates: [lng, lat] } : null })
    },
    onSuccess: async (result) => {
      if (farmId) {
        await queryClient.invalidateQueries({ queryKey: ['zones', session!.tenant.id, farmId] })
        router.back()
      } else {
        await queryClient.invalidateQueries({ queryKey: ['farms', session!.tenant.id] })
        router.replace(`/farm/${result.farmId}`)
      }
    },
  })
  if (!canManageFarms(session)) return <Screen><Empty icon="lock-closed-outline" title="Bạn chưa có quyền tạo" description="Vui lòng liên hệ chủ đơn vị hoặc quản trị viên để được hỗ trợ." /></Screen>
  function submit() {
    try {
      if (!code.trim() || !name.trim()) throw new Error('Nhập mã và tên trước khi lưu.')
      optionalNumber(area, 'Diện tích', 0)
      if (!farmId) {
        const lng = optionalNumber(longitude, 'Kinh độ', -180, 180)
        const lat = optionalNumber(latitude, 'Vĩ độ', -90, 90)
        if ((lng === null) !== (lat === null)) throw new Error('Nhập cả kinh độ và vĩ độ, hoặc để trống cả hai.')
      }
      setValidation(null); mutation.mutate()
    } catch (error) { setValidation(error as Error) }
  }
  const label = farmId ? 'khu vực' : 'nông trại'
  return <Screen><Heading eyebrow="KHÔNG GIAN CANH TÁC" title={`Thêm ${label}`} description="Bắt đầu với thông tin cơ bản. Bạn có thể bổ sung ranh giới sau trên web." /><ErrorNotice error={validation ?? mutation.error} />
    <Field label={`Mã ${label}`} value={code} onChangeText={setCode} maxLength={30} autoCapitalize="characters" placeholder={farmId ? 'VD: KHU_A' : 'VD: FARM_01'} editable={!mutation.isPending} />
    <Field label={`Tên ${label}`} value={name} onChangeText={setName} maxLength={farmId ? 100 : 150} editable={!mutation.isPending} />
    {!farmId ? <Field label="Địa chỉ (không bắt buộc)" value={address} onChangeText={setAddress} maxLength={200} editable={!mutation.isPending} /> : null}
    <Field label="Diện tích · ha (không bắt buộc)" value={area} onChangeText={setArea} keyboardType="decimal-pad" placeholder="0" editable={!mutation.isPending} />
    {!farmId ? <><Field label="Kinh độ (không bắt buộc)" value={longitude} onChangeText={setLongitude} keyboardType="numbers-and-punctuation" placeholder="108.123456" editable={!mutation.isPending} /><Field label="Vĩ độ (không bắt buộc)" value={latitude} onChangeText={setLatitude} keyboardType="numbers-and-punctuation" placeholder="10.123456" editable={!mutation.isPending} /></> : null}
    <Button title={`Tạo ${label}`} loading={mutation.isPending} onPress={submit} />
  </Screen>
}
