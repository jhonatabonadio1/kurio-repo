import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { AddCartItemInput, Cart } from '@/contracts/cart'
import { ApiError } from '@/contracts/api-error'
import { toast } from '@/shared/ui/toaster'
import { addCartItem, applyCoupon, removeCartItem, removeCoupon, updateCartItem } from './api'
import { cartKey } from './queries'

/**
 * Every cart mutation answers with the whole cart: it replaces the cache
 * (no refetch), and quotes for older versions are simply not used again.
 */
function useCartMutation<TVars>(mutationFn: (vars: TVars) => Promise<Cart>, errorPrefix?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (cart) => queryClient.setQueryData(cartKey(), cart),
    onError: (error) => {
      // Stock changed under us: refresh the cart so the screen shows the truth.
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey: cartKey() })
      if (errorPrefix !== undefined) toast(`${errorPrefix}${error.message}`, 'error')
    },
  })
}

export const useAddToCart = () => useCartMutation((input: AddCartItemInput) => addCartItem(input), '')
export const useUpdateCartItem = () =>
  useCartMutation(({ itemId, quantity }: { itemId: string; quantity: number }) => updateCartItem(itemId, quantity), '')
export const useRemoveCartItem = () => useCartMutation((itemId: string) => removeCartItem(itemId), '')
/** Coupon errors are shown under the field, not as a toast. */
export const useApplyCoupon = () => useCartMutation((code: string) => applyCoupon(code))
export const useRemoveCoupon = () => useCartMutation(() => removeCoupon(), '')
