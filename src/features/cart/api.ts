import {
  CartMergeResponseSchema,
  CartSchema,
  type AddCartItemInput,
} from '@/contracts/cart'
import type { Chain } from '@/contracts/catalog'
import { QuoteSchema } from '@/contracts/quote'
import { getParsed, http, sendParsed } from '@/shared/api/client'

export const fetchCart = (signal?: AbortSignal) => getParsed('/cart', CartSchema, { signal })
export const addCartItem = (input: AddCartItemInput) => sendParsed('post', '/cart/items', input, CartSchema)
export const updateCartItem = (itemId: string, quantity: number) =>
  sendParsed('patch', `/cart/items/${encodeURIComponent(itemId)}`, { quantity }, CartSchema)
export const removeCartItem = (itemId: string) =>
  sendParsed('delete', `/cart/items/${encodeURIComponent(itemId)}`, undefined, CartSchema)
export const applyCoupon = (code: string) => sendParsed('put', '/cart/coupon', { code }, CartSchema)
export const removeCoupon = () => sendParsed('delete', '/cart/coupon', undefined, CartSchema)
export const mergeGuestCart = () => sendParsed('post', '/cart/merge', undefined, CartMergeResponseSchema)
export const createQuote = (network: Chain, signal?: AbortSignal) =>
  http.post('/quotes', { network }, { signal }).then((r) => QuoteSchema.parse(r.data))
