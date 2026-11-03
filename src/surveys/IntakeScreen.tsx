import { useRef, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Text, View } from 'react-native'
import { useAuth } from '../auth/AuthProvider'
import { Button, DataError, Detail, Field, Heading, Loading, Notice, Screen } from '../ui/components'
import { ui } from '../ui/theme'
import { getPublicServices, submitPublicRequest, submitSurveyRequest } from './api'
import { SurveyAccess } from './components'
import { getFarm } from '../api/farms'
import { intakeArea, intakeCoordinate, intakeInteger } from './intakeNumbers'
import { money } from './paymentWorkflow'
import { vietnamDateTime } from './schedule'
import { validGuid } from './baseMapWorkflow'
import type { Intake } from './types'

export function IntakeScreen() {
  const { farmId } = useLocalSearchParams<{ farmId?: string }>()
  return <SurveyAccess><IntakeForm key={farmId ?? 'new'} farmId={farmId} /></SurveyAccess>
}
export function PublicIntakeScreen() { return <IntakeForm publicRequest /> }
function IntakeForm({ farmId, publicRequest = false }: { farmId?: string; publicRequest?: boolean }) {
  const session = useAuth().session, client = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({}), [serviceId, setServiceId] = useState(''), [timing, setTiming] = useState(false)
  const [receipt, setReceipt] = useState(false)
  const operation = useRef<{ payload: string; key: string } | null>(null), sending = useRef(false)
  const services = useQuery({ queryKey: ['public-survey-services'], queryFn: ({ signal }) => getPublicServices(signal) })
  const farm = useQuery({ queryKey: ['farm', session?.tenant?.id, farmId], queryFn: ({ signal }) => getFarm(session!.accessToken, farmId!, signal), enabled: !!session && !!farmId && validGuid(farmId) })
  const mutation = useMutation({ mutationFn: async () => {
    if (farmId && (!validGuid(farmId) || !farm.isSuccess)) throw new Error('Tải lại thông tin nông trại trước khi gửi yêu cầu.')
    if (!services.data?.some(item => item.surveyServiceId === serviceId)) throw new Error('Chọn dịch vụ khảo sát hiện có.')
    const body: Intake = { surveyServiceId: serviceId, estimatedPoleCount: values.poles?.trim() ? intakeInteger(values.poles, 1, 2147483647, 'Số trụ') : null, preferredStartAt: null, preferredEndAt: null, notes: values.notes?.trim() || null }
    if (!farmId) {
      if (!values.name?.trim() || !values.address?.trim()) throw new Error('Nhập tên và địa chỉ nông trại.')
      Object.assign(body, { farmName: values.name.trim(), farmAddress: values.address.trim(), approximateAreaHa: intakeArea(values.area ?? ''), longitude: intakeCoordinate(values.longitude ?? '', 'longitude'), latitude: intakeCoordinate(values.latitude ?? '', 'latitude') })
    }
    if (timing) { body.preferredStartAt = vietnamDateTime(values.startDate ?? '', values.startTime ?? ''); body.preferredEndAt = vietnamDateTime(values.endDate ?? '', values.endTime ?? ''); if (Date.parse(body.preferredEndAt) <= Date.parse(body.preferredStartAt)) throw new Error('Giờ kết thúc cần sau giờ bắt đầu.') }
    const payload = JSON.stringify(body)
    if (!publicRequest && operation.current?.payload !== payload) operation.current = { payload, key: `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` }
    if (publicRequest) {
      const details = { tenantCode: values.tenantCode?.trim() ?? '', tenantName: values.tenantName?.trim() ?? '', applicantName: values.fullName?.trim() ?? '', applicantEmail: values.email?.trim() ?? '', applicantPhone: values.phone?.trim() ?? '' }
      if (Object.values(details).some(value => !value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.applicantEmail)) throw new Error('Nhập đủ thông tin liên hệ, đơn vị và email hợp lệ.')
      const fullBody = { ...body, ...details }, fullPayload = JSON.stringify(fullBody)
      if (operation.current?.payload !== fullPayload) operation.current = { payload: fullPayload, key: `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` }
      await submitPublicRequest(fullBody, operation.current.key)
    } else await submitSurveyRequest(session!.accessToken, farmId, body, operation.current!.key)
  }, onSuccess: async () => { setReceipt(true); await client.invalidateQueries({ queryKey: ['owner-orders'] }) }, onSettled: () => { sending.current = false } })
  if (receipt) return <Screen><Heading title="Đã gửi yêu cầu khảo sát" /><Notice title="Chờ System Admin xét duyệt" description={publicRequest ? 'Sau khi được duyệt, Owner sẽ nhận lời mời tạo tài khoản qua email.' : 'Sau khi được duyệt, đơn khảo sát và lịch Manager đề xuất sẽ xuất hiện trong Công việc.'} /><Button title={publicRequest ? 'Về đăng nhập' : 'Xem đơn khảo sát'} onPress={() => router.replace(publicRequest ? '/login' : '/work')} /></Screen>
  function field(key: string, label: string, number = false, max = 100) { return <Field key={key} label={label} value={values[key] ?? ''} onChangeText={text => setValues(previous => ({ ...previous, [key]: text }))} keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : number ? 'numbers-and-punctuation' : 'default'} autoCapitalize={key === 'email' || key === 'tenantCode' ? 'none' : 'sentences'} multiline={key === 'notes' || key === 'address'} maxLength={max} editable={!mutation.isPending} /> }
  return <Screen><Heading title={farmId ? 'Đăng ký khảo sát' : 'Đăng ký nông trại mới'} description="Gửi nhu cầu để đội ngũ vận hành xét duyệt và đề xuất lịch phù hợp." />
    {publicRequest ? <>{field('tenantCode', 'Mã đơn vị', false, 50)}{field('tenantName', 'Tên đơn vị', false, 150)}{field('fullName', 'Họ và tên người liên hệ', false, 150)}{field('email', 'Email nhận lời mời', false, 254)}{field('phone', 'Số điện thoại', false, 30)}</> : null}
    {farmId ? farm.isPending ? <Loading /> : farm.isError ? <DataError error={farm.error} retry={() => { void farm.refetch() }} /> : <Notice title={farm.data?.name ?? 'Nông trại đã chọn'} /> : null}
    <Text style={ui.heading}>Chọn dịch vụ</Text>
    {services.isPending ? <Loading /> : services.isError ? <DataError error={services.error} retry={() => { void services.refetch() }} /> : services.data.map(service => <View key={service.surveyServiceId} style={ui.card}><Text style={ui.heading}>{service.name}</Text><Detail label="Giá tham khảo / trụ" value={money(service.indicativePrice.amountPerPole, service.indicativePrice.currency)} /><Button secondary={serviceId !== service.surveyServiceId} title={serviceId === service.surveyServiceId ? 'Đã chọn dịch vụ' : 'Chọn dịch vụ'} disabled={mutation.isPending} onPress={() => setServiceId(service.surveyServiceId)} /></View>)}
    {services.isSuccess && !services.data.length ? <Notice title="Chưa có dịch vụ được mở" description="Liên hệ quản trị hệ thống để kiểm tra dịch vụ và đơn giá." /> : null}
    {!farmId ? <>{field('name', 'Tên nông trại', false, 150)}{field('address', 'Địa chỉ nông trại', false, 500)}{field('area', 'Diện tích ước tính (ha)', true)}{field('longitude', 'Kinh độ', true)}{field('latitude', 'Vĩ độ', true)}</> : null}
    {field('poles', 'Số trụ ước tính (không bắt buộc)', true)}
    <Button secondary title={timing ? 'Bỏ thời gian mong muốn' : 'Thêm thời gian mong muốn'} disabled={mutation.isPending} onPress={() => setTiming(!timing)} />
    {timing ? <><Text style={ui.muted}>Đây là khoảng thời gian mong muốn, chưa phải lịch khảo sát chính thức. Thời gian Việt Nam (UTC+7).</Text>{field('startDate', 'Từ ngày · YYYY-MM-DD')}{field('startTime', 'Từ giờ · HH:mm')}{field('endDate', 'Đến ngày · YYYY-MM-DD')}{field('endTime', 'Đến giờ · HH:mm')}</> : null}
    {field('notes', 'Ghi chú (không bắt buộc)', false, 4000)}
    {mutation.isError ? <DataError error={mutation.error} retry={() => mutation.reset()} /> : null}
    <Button title="Gửi yêu cầu khảo sát" loading={mutation.isPending} disabled={!services.isSuccess || !serviceId || (!!farmId && !farm.isSuccess)} onPress={() => { if (sending.current) return; sending.current = true; mutation.mutate() }} />
  </Screen>
}
