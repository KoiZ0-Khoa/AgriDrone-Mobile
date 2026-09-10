import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ApiError } from '../api/client'
import { archiveFarm, archiveZone, getFarm, getZone, updateZone } from '../api/farms'
import type { Zone } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { Button, Field, Heading, Notice, Screen } from '../ui/components'
import { colors, ui } from '../ui/theme'
import { isVersionConflict, managementError } from './managementErrors'
import { optionalNumber } from './validation'

type Props = { farmId: string; name: string; version: number; zone?: Zone; onArchived: () => void }

export function FarmManagementActions({ farmId, name, version, zone, onArchived }: Props) {
  const { session } = useAuth()
  const client = useQueryClient()
  const [mode, setMode] = useState<'edit' | 'archive' | null>(null)
  const [snapshot, setSnapshot] = useState({ version, boundary: zone?.boundary ?? null })
  const [zoneName, setZoneName] = useState(name)
  const [area, setArea] = useState('')
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState<unknown>(null)
  const [reloading, setReloading] = useState(false)
  const [saved, setSaved] = useState(false)
  const mutation = useMutation({
    mutationFn: async () => {
      if (!Number.isSafeInteger(snapshot.version) || snapshot.version < 1) throw new Error('Thiếu phiên bản dữ liệu. Hãy mở lại màn hình chi tiết.')
      if (mode === 'edit' && zone) {
        if (!zoneName.trim() || zoneName.trim().length > 100) throw new Error('Tên khu vực phải có từ 1 đến 100 ký tự.')
        const areaHectares = optionalNumber(area, 'Diện tích', 0)
        await updateZone(session!.accessToken, farmId, zone.zoneId, { name: zoneName.trim(), areaHectares, boundary: snapshot.boundary, expectedVersion: snapshot.version })
      } else {
        if (session?.role !== 'OWNER') throw new Error('Chỉ Owner có quyền lưu trữ.')
        if (!reason.trim() || reason.trim().length > 500) throw new Error('Lý do lưu trữ phải có từ 1 đến 500 ký tự.')
        const body = { expectedVersion: snapshot.version, reason: reason.trim() }
        if (zone) await archiveZone(session.accessToken, farmId, zone.zoneId, body)
        else await archiveFarm(session.accessToken, farmId, body)
      }
    },
    onSuccess: async () => {
      const archived = mode === 'archive'
      setMode(null)
      if (archived) onArchived()
      else setSaved(true)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['farms', session?.tenant.id] }),
        client.invalidateQueries({ queryKey: ['farm', session?.tenant.id, farmId] }),
        client.invalidateQueries({ queryKey: ['zones', session?.tenant.id, farmId] }),
        client.invalidateQueries({ queryKey: ['zone', session?.tenant.id, farmId, zone?.zoneId] }),
      ])
    },
  })
  function open(next: 'edit' | 'archive') {
    mutation.reset()
    setLocalError(null)
    setSaved(false)
    setSnapshot({ version, boundary: zone?.boundary ?? null })
    setZoneName(name)
    setArea(zone?.areaHectares == null ? '' : String(zone.areaHectares))
    setReason('')
    setMode(next)
  }
  async function reload() {
    setReloading(true)
    setLocalError(null)
    try {
      const latest = zone ? await getZone(session!.accessToken, farmId, zone.zoneId) : await getFarm(session!.accessToken, farmId)
      client.setQueryData(zone ? ['zone', session?.tenant.id, farmId, zone.zoneId] : ['farm', session?.tenant.id, farmId], latest)
      setSnapshot({ version: latest.version, boundary: latest.boundary })
      if (mode === 'edit') {
        setZoneName(latest.name)
        setArea(latest.areaHectares === null ? '' : String(latest.areaHectares))
      }
      mutation.reset()
    } catch (error) { setLocalError(error) }
    finally { setReloading(false) }
  }
  const blocked = isVersionConflict(mutation.error) || (mutation.error instanceof ApiError && [403, 404].includes(mutation.error.status))
  const busy = mutation.isPending || reloading
  return <View style={ui.stack}>
    {saved ? <Notice title="Đã cập nhật khu vực" /> : null}
    {zone ? <Button secondary title="Chỉnh sửa khu vực" icon="create-outline" onPress={() => open('edit')} /> : null}
    {session?.role === 'OWNER' ? <Button secondary title={`Lưu trữ ${zone ? 'khu vực' : 'nông trại'}`} icon="archive-outline" onPress={() => open('archive')} /> : null}
    <Modal visible={mode !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!busy) setMode(null) }}>
      <SafeAreaView style={styles.modal}>
        <Screen>
          <Heading title={mode === 'edit' ? 'Chỉnh sửa khu vực' : 'Lưu trữ'} description={name} />
          {mode === 'edit' ? <>
            <Text style={ui.muted}>Owner hoặc người được phân công quản lý khu vực có thể chỉnh sửa thông tin này.</Text>
            <Field label="Tên khu vực" value={zoneName} onChangeText={setZoneName} maxLength={100} editable={!busy} />
            <Field label="Diện tích (ha)" value={area} onChangeText={setArea} keyboardType="decimal-pad" editable={!busy} placeholder="Chưa cập nhật" />
            <Text style={ui.muted}>Mã khu vực và ranh giới hiện có được giữ nguyên.</Text>
          </> : <>
            <Notice title="Kiểm tra trước khi lưu trữ" description={`${zone ? 'Khu vực' : 'Nông trại'} sẽ được đưa khỏi danh sách sử dụng. Lịch sử liên quan được giữ lại.`} />
            <Text style={ui.muted}>{zone ? 'Cần hoàn tất nhiệm vụ bay và công việc đang mở trước.' : 'Cần lưu trữ các khu vực còn lại và hoàn tất nhiệm vụ bay, công việc đang mở trước.'}</Text>
            <Field label="Lý do lưu trữ" value={reason} onChangeText={setReason} maxLength={500} multiline editable={!busy} />
          </>}
          {localError || mutation.error ? <Notice error title={managementError(localError ?? mutation.error)} /> : null}
          {isVersionConflict(mutation.error) ? <Button secondary title={mode === 'edit' ? 'Tải bản mới (thay nội dung đang nhập)' : 'Tải bản mới'} loading={reloading} onPress={() => void reload()} /> : null}
          <Button title={mode === 'edit' ? 'Lưu thay đổi' : 'Xác nhận lưu trữ'} loading={mutation.isPending} disabled={blocked || reloading} onPress={() => { setLocalError(null); mutation.mutate() }} />
          <Button secondary title="Hủy" disabled={busy} onPress={() => setMode(null)} />
        </Screen>
      </SafeAreaView>
    </Modal>
  </View>
}

const styles = StyleSheet.create({ modal: { flex: 1, backgroundColor: colors.white } })
