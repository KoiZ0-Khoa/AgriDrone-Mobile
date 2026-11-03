import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshControl, Text, View } from 'react-native'
import { request } from '../api/client'
import type { FarmDetail, PagedResult } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { Button, DataError, Detail, Empty, Heading, Loading, Screen, formatArea } from '../ui/components'
import { ui } from '../ui/theme'
import { ActionModal } from '../management/ActionModal'
import type { Action } from '../management/actions'
import { dateTime, PageButtons, RecordCard, SurveyAccess } from './components'

type ArchivedFarm = FarmDetail & { archivedAt: string }
export function ArchivedFarms() { return <SurveyAccess><ArchiveList /></SurveyAccess> }
function ArchiveList() {
  const session = useAuth().session!, token = session.accessToken, client = useQueryClient()
  const [page, setPage] = useState(1), [selected, setSelected] = useState(''), [action, setAction] = useState<Action | null>(null)
  const query = useQuery({ queryKey: ['archived-farms', session.tenant?.id, page], queryFn: ({ signal }) => request<PagedResult<ArchivedFarm>>(`/api/farms/archived?pageNumber=${page}&pageSize=20`, { token, signal }) })
  const detail = useQuery({ queryKey: ['archived-farm', session.tenant?.id, selected], queryFn: ({ signal }) => request<ArchivedFarm>(`/api/farms/${encodeURIComponent(selected)}/archived`, { token, signal }), enabled: !!selected })
  return <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); if (selected) void detail.refetch() }} />}>
    <Heading title="Nông trại đã lưu trữ" description="Xem thông tin và khôi phục nông trại để tiếp tục sử dụng." />
    {selected ? <View style={ui.card}><Button secondary title="Đóng chi tiết" onPress={() => setSelected('')} />{detail.isPending ? <Loading /> : detail.isError ? <DataError error={detail.error} retry={() => { void detail.refetch() }} /> : detail.data.id === selected ? <><Text style={ui.heading}>{detail.data.name}</Text><Text style={ui.muted}>{detail.data.address ?? 'Chưa có địa chỉ'}</Text><Detail label="Diện tích" value={formatArea(detail.data.areaHectares)} /><Detail label="Lưu trữ lúc" value={dateTime(detail.data.archivedAt)} /><Button title="Khôi phục nông trại" disabled={detail.isFetching || !Number.isSafeInteger(detail.data.version) || detail.data.version < 1} onPress={() => { const farm = detail.data; setAction({ title: `Khôi phục ${farm.name}`, description: 'Các khu vực đã lưu trữ không tự được khôi phục cùng nông trại.', fields: [], run: () => request(`/api/farms/${encodeURIComponent(farm.id)}/restore`, { token, method: 'PUT', body: { expectedVersion: farm.version } }), after: async () => { setSelected(''); await client.invalidateQueries({ queryKey: ['archived-farms'] }); await client.invalidateQueries({ queryKey: ['farms'] }) } }) }} /></> : <Text style={ui.muted}>Thông tin nông trại không khớp. Tải lại để kiểm tra.</Text>}</View> : null}
    {query.isPending ? <Loading /> : query.isError ? <DataError error={query.error} retry={() => { void query.refetch() }} /> : query.data.items.length ? query.data.items.map(farm => <RecordCard key={farm.id} title={farm.name} description={`Lưu trữ ${dateTime(farm.archivedAt)}`} onPress={() => setSelected(farm.id)} />) : <Empty title="Chưa có nông trại đã lưu trữ" description="Nông trại được lưu trữ trong đơn vị hiện tại sẽ xuất hiện tại đây." />}
    <PageButtons page={page} hasNext={query.data?.hasNextPage} disabled={query.isFetching} change={setPage} />
    {action ? <ActionModal action={action} close={() => setAction(null)} /> : null}
  </Screen>
}
