import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { ApiError } from '@/contracts/api-error'
import type { CreateOrderInput, Order } from '@/contracts/order'
import { cartKey } from '@/features/cart/queries'
import { createOrder } from '@/features/orders/api'
import { orderKeys } from '@/features/orders/queries'
import { sessionStore } from '@/shared/auth/session-store'
import { checkoutDraft } from './draft'

export const PLACE_ORDER_KEY = ['orders', 'create'] as const

type Variables = { input: CreateOrderInput; idempotencyKey: string }

/**
 * Places the order with an idempotency key. A lost answer (timeout,
 * network, 5xx) is retried once with the SAME key: the API returns the
 * order it already created instead of creating another one.
 *
 * Success and failure are handled here, not in the caller: the order can be
 * confirmed (and the cart emptied) while the answer is still lost, which
 * unmounts the checkout form; these callbacks still run.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationKey: PLACE_ORDER_KEY,
    mutationFn: async ({ input, idempotencyKey }: Variables): Promise<Order> => {
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
      checkoutDraft.clear()
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true })
    },
    onError: (error, { input, idempotencyKey }) => {
      const userId = sessionStore.userId()
      // A definite answer (409, 422...): nothing to recover, keep only the key.
      if (userId && error instanceof ApiError && !error.retryable) {
        checkoutDraft.update(userId, { attempt: { quoteId: input.quoteId, key: idempotencyKey } })
      }
      // Price/stock changed: the cart and its quotes must be reloaded.
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey: cartKey() })
    },
  })
}

export const newIdempotencyKey = () => `ord-${crypto.randomUUID()}`
