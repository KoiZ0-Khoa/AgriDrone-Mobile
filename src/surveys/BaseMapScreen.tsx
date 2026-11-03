import { useRef, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshControl, Text, View } from 'react-native'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { Button, DataError, Detail, Empty, Heading, Loading, Notice, Screen } from '../ui/components'
import { ui } from '../ui/theme'
import { ActionModal } from '../management/ActionModal'
import { type Action, type Field } from '../management/actions'
import { getCurrentBaseMapDraft, publishBaseMapDraft, reviewMappingBatch, reviewMappingCandidate, validateBaseMapDraft } from './baseMapApi'
import { batchReviewBody, candidateReviewBody, canPublishDraft, decisionLabel, decisionLabels, draftFingerprint, editableDraft, validGuid } from './baseMapWorkflow'
import type { MappingCandidate, MappingValidation, ReviewDecision } from './baseMapTypes'
import { PageButtons, readableCode, SurveyAccess } from './components'
import { intakeCoordinate, intakeInteger, intakeOptional } from './intakeNumbers'

export function BaseMapScreen() {
  const { farmId = '', surveyOrderId } = useLocalSearchParams<{ farmId: string; surveyOrderId?: string }>()
  return <SurveyAccess manager>{validGuid(farmId) && (!surveyOrderId || validGuid(surveyOrderId)) ? <Draft key={`${farmId}:${surveyOrderId ?? ''}`} farmId={farmId} orderId={surveyOrderId} /> : <Screen><Empty title="Liên kết không hợp lệ" description="Mở bản đồ từ nông trại hoặc đơn khảo sát được giao." /></Screen>}</SurveyAccess>
}
function Draft({ farmId, orderId }: { farmId: string; orderId?: string }) {
  const token = useAuth().session!.accessToken, client = useQueryClient()
  const queryKey = ['manager-map', farmId, orderId ?? '']
  const query = useQuery({ queryKey, queryFn: ({ signal }) => getCurrentBaseMapDraft(token, farmId, orderId, signal) })
  const [page, setPage] = useState(1), [selected, setSelected] = useState<string[]>([])
  const [action, setAction] = useState<Action | null>(null), [expanded, setExpanded] = useState('')
  const [checked, setChecked] = useState<{ stamp: string; result: MappingValidation } | null>(null)
  const [published, setPublished] = useState<number | null>(null)
  const validating = useRef(false)
  const validation = useMutation({ mutationFn: async () => {
    const draft = query.data
    if (!draft || query.isFetching || !editableDraft(draft)) throw new Error('Tải lại bản đồ trước khi kiểm tra.')
    return { stamp: draftFingerprint(draft), result: await validateBaseMapDraft(token, farmId, draft.draftId) }
  }, onSuccess: setChecked, onSettled: () => { validating.current = false } })
  async function refresh() { setChecked(null); setSelected([]); setAction(null); validation.reset(); await query.refetch() }
  if (published !== null) return <Screen><Heading title="Đã phát hành bản đồ" /><Notice title={`Đã xác nhận ${published.toLocaleString('vi-VN')} trụ`} description="Cây chính thức đã được cập nhật. Tiếp tục xác nhận số trụ và giá tại đơn khảo sát." /><Button title="Mở đơn khảo sát" onPress={() => router.replace(orderId ? `/manager/orders/${orderId}` : '/work')} /><Button secondary title="Về nông trại" onPress={() => router.replace(`/manager/farms/${farmId}`)} /></Screen>
  if (query.isPending) return <Screen><Loading /></Screen>
  if (query.isError) return <Screen><Heading title="Duyệt bản đồ nền" />{query.error instanceof ApiError && query.error.code === 'FarmBaseMapDraft.NotFound' && query.error.status === 404 ? <Empty title="Chưa có bản đồ nháp chờ duyệt" description="Bản đồ sẽ xuất hiện sau khi ảnh khảo sát được xử lý và chuyển sang bước duyệt." /> : <DataError error={query.error} retry={() => { void refresh() }} />}<Button secondary title="Tải lại" onPress={() => { void refresh() }} /></Screen>
  const draft = query.data, stamp = draftFingerprint(draft)
  const busy = query.isFetching || validation.isPending, editable = editableDraft(draft)
  const canPublish = canPublishDraft(draft, checked?.result ?? null, checked?.stamp ?? null) && !busy && !validation.isError
  const visible = draft.candidates.slice((page - 1) * 20, page * 20)
  const after = async () => { setChecked(null); setSelected([]); await query.refetch() }
  function assertCurrent() {
    const current = client.getQueryData<typeof draft>(queryKey)
    if (!current || draftFingerprint(current) !== stamp || client.getQueryState(queryKey)?.fetchStatus === 'fetching' || !editableDraft(current)) throw new Error('Bản đồ đã thay đổi. Đóng biểu mẫu và tải lại trước khi tiếp tục.')
  }
  function review(candidate: MappingCandidate, decision: ReviewDecision) {
    setChecked(null)
    const fields: Field[] = []
    if (['MatchExisting', 'Relocate', 'Replace'].includes(decision)) fields.push({ key: 'plantId', label: 'Mã cây chính thức cần ghép', value: candidate.correctedMatchedPlantId ?? candidate.proposedMatchedPlantId ?? '' })
    if (decision !== 'Reject') fields.push({ key: 'longitude', label: 'Kinh độ hiệu chỉnh', value: String(candidate.correctedLongitude ?? candidate.longitude), kind: 'number' }, { key: 'latitude', label: 'Vĩ độ hiệu chỉnh', value: String(candidate.correctedLatitude ?? candidate.latitude), kind: 'number' }, { key: 'row', label: 'Hàng', value: String(candidate.correctedRowIndex ?? candidate.proposedRowIndex ?? ''), kind: 'number', optional: true }, { key: 'column', label: 'Cột', value: String(candidate.correctedColumnIndex ?? candidate.proposedColumnIndex ?? ''), kind: 'number', optional: true })
    fields.push({ key: 'reason', label: 'Ghi chú duyệt', optional: true, max: 2000 })
    setAction({ title: decisionLabels[decision], fields, run: async v => {
      assertCurrent()
      return reviewMappingCandidate(token, farmId, draft.draftId, candidate.candidateId, candidateReviewBody(candidate, { decision, plantId: v.plantId, longitude: decision === 'Reject' ? null : intakeCoordinate(v.longitude, 'longitude'), latitude: decision === 'Reject' ? null : intakeCoordinate(v.latitude, 'latitude'), row: intakeOptional(v.row, value => intakeInteger(value, 1, 2147483647, 'Hàng')), column: intakeOptional(v.column, value => intakeInteger(value, 1, 2147483647, 'Cột')), reason: v.reason }))
    }, after })
  }
  return <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void refresh() }} />}>
    <Heading title="Duyệt bản đồ nền" description={`Phiên bản ${draft.versionNumber} · ${draft.totalCandidates} điểm`} />
    <Notice title={`${draft.pendingCount} chưa duyệt · ${draft.rejectedCount} đã loại`} description="Kiểm tra vị trí và quyết định cho từng cây/trụ trước khi phát hành." />
    {!editable ? <Notice title="Bản đồ hiện chỉ được xem" /> : null}
    <Button title="Kiểm tra bản đồ" disabled={!editable || busy} loading={validation.isPending} onPress={() => { if (validating.current) return; validating.current = true; setChecked(null); validation.mutate() }} />
    {validation.isError ? <DataError error={validation.error} retry={() => { void refresh() }} /> : null}
    {checked?.stamp === stamp ? <View style={ui.card}><Text style={ui.heading}>{checked.result.isValid ? `Hợp lệ · ${checked.result.confirmedPublishablePoleCount} trụ` : 'Còn lỗi cần xử lý'}</Text>{checked.result.issues.map((issue, index) => <Text key={index} style={ui.text}>{issue.message}</Text>)}</View> : null}
    <Button title="Phát hành bản đồ" disabled={!canPublish} onPress={() => setAction({ title: 'Phát hành bản đồ nền', description: `Xác nhận ${checked!.result.confirmedPublishablePoleCount} trụ. Các quyết định sẽ cập nhật cây chính thức.`, fields: [], run: async () => {
      assertCurrent()
      if (!canPublishDraft(draft, checked?.result ?? null, checked?.stamp ?? null)) throw new Error('Kiểm tra lại bản đồ trước khi phát hành.')
      const result = await publishBaseMapDraft(token, farmId, draft.draftId)
      if (result.farmBaseMapVersionId.toLowerCase() !== draft.draftId.toLowerCase()) throw new Error('Kết quả phát hành không khớp bản đồ. Tải lại để kiểm tra.')
      setPublished(result.confirmedSurveyPoleCount)
      await client.invalidateQueries({ queryKey: ['manager-order'] }); await client.invalidateQueries({ queryKey: ['manager-orders'] }); await client.invalidateQueries({ queryKey: ['manager-farm'] })
    } })} />
    {editable ? <><Text style={ui.muted}>Chọn các điểm trên trang này để duyệt hàng loạt.</Text>{(['CreateNew', 'Reject'] as const).map(decision => <Button key={decision} secondary title={`${decision === 'CreateNew' ? 'Tạo cây từ' : 'Loại'} ${selected.length} điểm đã chọn`} disabled={busy || !selected.length} onPress={() => { setChecked(null); setAction({ title: decisionLabels[decision], description: `${selected.length} điểm sẽ được cập nhật.`, fields: [{ key: 'reason', label: 'Ghi chú', optional: true, max: 2000 }], run: async v => { assertCurrent(); const result = await reviewMappingBatch(token, farmId, draft.draftId, batchReviewBody(draft, selected, decision, v.reason)); if (result.totalReviewed !== selected.length) throw new Error('Số điểm đã duyệt khác với lựa chọn. Đóng và tải lại để kiểm tra.') }, after }) }} />)}</> : null}
    {visible.map((candidate, index) => <View key={candidate.candidateId} style={ui.card}><Text style={ui.heading}>{readableCode(candidate.treeId) ?? `Điểm ${(page - 1) * 20 + index + 1}`}</Text><Text style={ui.text}>{decisionLabel(candidate.reviewDecision)}</Text><Detail label="Hàng / cột" value={`${candidate.correctedRowIndex ?? candidate.proposedRowIndex ?? '—'} / ${candidate.correctedColumnIndex ?? candidate.proposedColumnIndex ?? '—'}`} /><Text style={ui.muted}>{candidate.correctedLatitude ?? candidate.latitude}, {candidate.correctedLongitude ?? candidate.longitude}</Text><Text style={ui.muted}>{candidate.boundaryClassification === 'IN_BOUNDARY' ? 'Trong ranh giới' : 'Cần kiểm tra ranh giới'} · {(candidate.positionConfidence * 100).toFixed(1)}%</Text>{editable ? <><Button secondary title={selected.includes(candidate.candidateId) ? 'Bỏ chọn điểm' : 'Chọn điểm'} disabled={busy} onPress={() => setSelected(previous => previous.includes(candidate.candidateId) ? previous.filter(id => id !== candidate.candidateId) : [...previous, candidate.candidateId])} /><Button secondary title={expanded === candidate.candidateId ? 'Ẩn thao tác duyệt' : 'Xem & duyệt điểm'} disabled={busy} onPress={() => setExpanded(expanded === candidate.candidateId ? '' : candidate.candidateId)} />{expanded === candidate.candidateId ? (Object.keys(decisionLabels).filter(key => key !== 'Pending') as ReviewDecision[]).map(decision => <Button key={decision} secondary title={decisionLabels[decision]} disabled={busy} onPress={() => review(candidate, decision)} />) : null}</> : null}</View>)}
    <PageButtons page={page} hasNext={page * 20 < draft.candidates.length} disabled={busy} change={next => { setSelected([]); setPage(next) }} />
    {action ? <ActionModal action={action} close={() => setAction(null)} /> : null}
  </Screen>
}
