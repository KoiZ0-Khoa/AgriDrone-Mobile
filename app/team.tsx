import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Text, View } from 'react-native'
import { useAuth } from '../src/auth/AuthProvider'
import { Button, DataError, Empty, Heading, Loading, Notice, Screen } from '../src/ui/components'
import { ui } from '../src/ui/theme'
import * as api from '../src/management/api'
import { confirmation, inviteAction, roleLabel, type Action } from '../src/management/actions'
import { ActionModal } from '../src/management/ActionModal'
export default function TeamScreen() {
  const { session, logout } = useAuth()
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [saved, setSaved] = useState('')
  const allowed = session?.role === 'OWNER' || session?.role === 'TENANT_ADMIN'
  const query = useQuery({ queryKey: ['members', session?.tenant.id, page], queryFn: () => api.getMembers(session!.accessToken, page), enabled: allowed })
  if (!session || !allowed) return <Screen><Empty title="Không có quyền truy cập" description="Danh sách này dành cho chủ đơn vị và quản trị viên." /></Screen>
  const token = session.accessToken
  const choose = (next: Action) => { setSaved(''); setAction(next) }
  return <Screen><Heading title="Thành viên" description={session.tenant.name} />
    {session.role === 'OWNER' ? <Button title="Mời quản trị viên" icon="person-add-outline" onPress={() => choose(inviteAction(token))} /> : null}
    {saved ? <Notice title={saved} /> : null}
    {query.isPending ? <Loading /> : query.isError ? <DataError error={query.error} retry={() => { void query.refetch() }} /> : query.data.items.length === 0 ? <Empty title="Chưa có thành viên" description="Thành viên tham gia đơn vị sẽ xuất hiện tại đây." /> : null}
    {query.data?.items.map(user => <View key={user.id} style={ui.stack}><Text style={ui.heading}>{user.fullName}</Text><Text style={ui.muted}>{user.email} · {roleLabel(user.role)}</Text>
      {session.role === 'OWNER' && user.role !== 0 && user.email !== session.email ? <><Button secondary title={selected === user.id ? 'Ẩn thao tác' : 'Quản lý thành viên'} onPress={() => setSelected(selected === user.id ? null : user.id)} />
        {selected === user.id ? <View style={ui.stack}>
          <Button secondary title={user.role === 1 ? 'Chuyển thành Thành viên' : 'Chuyển thành Quản trị viên'} onPress={() => choose(confirmation('Đổi vai trò', `Xác nhận đổi vai trò của ${user.fullName}?`, () => api.changeMemberRole(token, user.id, user.role === 1 ? 'MEMBER' : 'TENANT_ADMIN')))} />
          <Button secondary title="Kích hoạt quyền truy cập" onPress={() => choose(confirmation('Kích hoạt quyền truy cập', `Cho phép ${user.fullName} truy cập đơn vị?`, () => api.changeMemberStatus(token, user.id, 'ACTIVE')))} />
          <Button secondary title="Ngừng quyền truy cập" onPress={() => choose(confirmation('Ngừng quyền truy cập', `${user.fullName} sẽ không còn quyền truy cập đơn vị.`, () => api.changeMemberStatus(token, user.id, 'INACTIVE')))} />
          <Button secondary title="Chuyển quyền Owner" onPress={() => choose(confirmation('Chuyển quyền Owner', `Chuyển quyền sở hữu cho ${user.fullName} (${user.email})? Bạn sẽ trở thành Tenant Admin và cần đăng nhập lại. Người nhận phải có membership đang hoạt động.`, () => api.transferOwnership(token, user.id), logout))} />
        </View> : null}</> : null}
    </View>)}
    <Text style={ui.muted}>Trang {page} · {query.data?.totalCount ?? 0} thành viên</Text>
    <Button secondary title="Trang trước" disabled={page <= 1 || query.isFetching} onPress={() => { setPage(p => p - 1); setSelected(null) }} /><Button secondary title="Trang sau" disabled={!query.data?.hasNextPage || query.isFetching} onPress={() => { setPage(p => p + 1); setSelected(null) }} />
    {action ? <ActionModal action={action} close={() => setAction(null)} success={setSaved} /> : null}
  </Screen>
}
