import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/contracts/api-error'
import type { CreateOrderInput, Order } from '@/contracts/order'
import { cartKey } from '@/features/cart/queries'
import { createOrder } from '@/features/orders/api'
import { orderKeys } from '@/features/orders/queries'
import { sessionStore } from '@/shared/auth/session-store'

/**
 * Places the order with an idempotency key. A lost answer (timeout,
 * network, 5xx) is retried once with the SAME key: the API returns the
 * order it already created instead of creating another one.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ input, idempotencyKey }: { input: CreateOrderInput; idempotencyKey: string }): Promise<Order> => {
      try {
        return await createOrder(input, idempotencyKey)
      } catch (error) {
        if (error instanceof ApiError && error.retryable) return createOrder(input, idempotencyKey)
        throw error
      }
    },
    retry: false,
    onSuccess: (order) => {
      const userId = sessionStore.userId()
      if (userId) {
        queryClient.setQueryData(orderKeys.detail(userId, order.id), order)
        void queryClient.invalidateQueries({ queryKey: orderKeys.pending(userId) })
      }
    },
    onError: (error) => {
      // Price/stock changed: the cart and its quotes must be reloaded.
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey: cartKey() })
    },
  })
}

export const newIdempotencyKey = () => `ord-${crypto.randomUUID()}`
