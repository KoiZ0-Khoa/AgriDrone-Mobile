import { useState } from 'react'
import { Modal, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { Button, Field, Heading, Notice, Screen } from '../ui/components'
import { ui } from '../ui/theme'
import { validate, type Action, type Values } from './actions'

export function ActionModal({ action, close, success }: { action: Action; close: () => void; success?: (message: string) => void }) {
  const [values, setValues] = useState<Values>(() => Object.fromEntries(action.fields.map(f => [f.key, f.value ?? ''])))
  const client = useQueryClient()
  const mutation = useMutation({ mutationFn: async () => { validate(action.fields, values); await action.run(values) }, onSuccess: async () => {
    success?.(action.success ?? 'Đã lưu thay đổi')
    close()
    await client.invalidateQueries()
    await action.after?.()
  } })
  const conflict = mutation.error instanceof ApiError && mutation.error.code?.includes('ConcurrentUpdate')
  const forbidden = mutation.error instanceof ApiError && [403, 404].includes(mutation.error.status)
  const dismiss = () => { if (!mutation.isPending) { if (conflict) void client.refetchQueries({ type: 'active' }); close() } }
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={dismiss}><SafeAreaView style={ui.fill}><Screen>
    <Heading title={action.title} />
    {action.description ? <Text style={ui.muted}>{action.description}</Text> : null}
    {action.fields.map(f => <Field key={f.key} label={f.label} value={values[f.key]} maxLength={f.max} multiline={f.kind === 'multiline'} secureTextEntry={f.kind === 'password'} keyboardType={f.kind === 'number' ? 'numbers-and-punctuation' : f.kind === 'email' ? 'email-address' : 'default'} autoCapitalize={f.kind === 'email' || f.kind === 'password' ? 'none' : 'sentences'} editable={!mutation.isPending} onChangeText={value => setValues(v => ({ ...v, [f.key]: value }))} />)}
    {mutation.error ? <Notice error title={conflict ? 'Dữ liệu đã thay đổi. Đóng form, chờ tải lại và mở chỉnh sửa để kiểm tra bản mới.' : forbidden ? 'Bạn không có quyền hoặc dữ liệu không còn trong phạm vi truy cập.' : mutation.error.message} /> : null}
    <Button title="Xác nhận" loading={mutation.isPending} disabled={Boolean(conflict || forbidden)} onPress={() => mutation.mutate()} />
    <Button secondary title={conflict ? 'Đóng và tải lại' : 'Hủy'} disabled={mutation.isPending} onPress={dismiss} />
  </Screen></SafeAreaView></Modal>
}
