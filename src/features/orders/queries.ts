import { queryOptions } from '@tanstack/react-query'

import { isTerminalStatus, type Order } from '@/contracts/order'
import { realtimeStatus } from '@/shared/realtime/status'
import { fetchOrder, fetchPendingOrders } from './api'

/** Private data: everything under ['me', userId] is dropped on logout/user switch. */
export const orderKeys = {
  all: (userId: string) => ['me', userId, 'orders'] as const,
  detail: (userId: string, id: string) => [...orderKeys.all(userId), 'detail', id] as const,
  pending: (userId: string) => [...orderKeys.all(userId), 'pending'] as const,
}

export const orderQueryOptions = (userId: string, id: string) =>
  queryOptions({
    queryKey: orderKeys.detail(userId, id),
    queryFn: ({ signal }) => fetchOrder(id, signal),
    staleTime: 10_000,
    // Socket.IO delivers the result; poll only while pending and the socket is down.
    refetchInterval: (query) => {
      const order = query.state.data as Order | undefined
      return order && !isTerminalStatus(order.status) && realtimeStatus.get() !== 'connected' ? 4_000 : false
    },
  })

export const pendingOrdersQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: orderKeys.pending(userId),
    queryFn: ({ signal }) => fetchPendingOrders(signal),
    staleTime: 0,
  })
