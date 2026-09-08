import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { canManageFarms } from '../auth/session'
import { getFarms } from '../api/farms'

export function useFarmCatalog() {
  const { session } = useAuth()
  const permitted = canManageFarms(session)
  const query = useInfiniteQuery({
    queryKey: ['farms', session?.tenant.id, 'list'], initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => getFarms(session!.accessToken, pageParam, signal),
    getNextPageParam: page => page.hasNextPage ? page.pageNumber + 1 : undefined, enabled: permitted,
  })
  return { query, permitted, farms: query.data?.pages.flatMap(page => page.items) ?? [], total: query.data?.pages[0].totalCount }
}
