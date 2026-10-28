import { queryOptions, useQuery } from '@tanstack/react-query'

import type { Chain } from '@/contracts/catalog'
import { getCartToken } from '@/shared/auth/cart-token'
import { sessionStore, useSessionToken } from '@/shared/auth/session-store'
import { createQuote, fetchCart } from './api'

/**
 * Cart cache key per owner: the user's cart lives under ['me', userId]
 * (removed on logout/user switch); a guest cart under its token.
 */
export const cartKey = () => {
  const userId = sessionStore.userId()
  return userId ? (['me', userId, 'cart'] as const) : (['cart', 'guest', getCartToken()] as const)
}

export const cartQueryOptions = () =>
  queryOptions({
    queryKey: cartKey(),
    queryFn: ({ signal }) => fetchCart(signal),
    staleTime: 0,
  })

/** One quote per cart version and network: a changed cart never reuses an old quote. */
export const quoteQueryOptions = (cartVersion: number, network: Chain) =>
  queryOptions({
    queryKey: [...cartKey(), 'quote', cartVersion, network] as const,
    queryFn: ({ signal }) => createQuote(network, signal),
    staleTime: 60_000,
    gcTime: 60_000,
  })

export function useCart() {
  useSessionToken()
  return useQuery(cartQueryOptions())
}
