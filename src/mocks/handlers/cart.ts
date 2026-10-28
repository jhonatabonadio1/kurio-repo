import { http, HttpResponse } from 'msw'

import {
  AddCartItemInputSchema,
  ApplyCouponInputSchema,
  UpdateCartItemInputSchema,
  type Cart,
  type CartMergeResponse,
} from '@/contracts/cart'
import { db } from '../db/store'
import { authenticate } from '../lib/auth'
import {
  CART_TOKEN_HEADER,
  checkCoupon,
  findCart,
  findEdition,
  guestOwnerKey,
  quantityLimit,
  resolveCartOwner,
  toCartResponse,
  updateCart,
  userOwnerKey,
} from '../lib/cart'
import { randomId } from '../lib/crypto'
import { errors } from '../lib/http'
import { readJson, zodFields } from '../lib/validation'
import { withNetwork } from '../network'

const json = (cart: ReturnType<typeof findCart>) => HttpResponse.json<Cart>(toCartResponse(cart))

const limitError = (limit: number) =>
  limit === 0
    ? errors.conflict('AVAILABILITY_CONFLICT', 'Esta edição está esgotada.')
    : errors.conflict('AVAILABILITY_CONFLICT', `Quantidade máxima para esta edição: ${limit}.`, {
        quantity: `Máximo de ${limit}.`,
      })

export const cartHandlers = [
  http.get(
    '*/api/cart',
    withNetwork('cart.get', ({ request }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      return json(db.read((s) => findCart(s, owner.ownerKey)))
    }),
  ),

  http.post(
    '*/api/cart/items',
    withNetwork('cart.add', async ({ request }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const parsed = AddCartItemInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return errors.validation(zodFields(parsed.error))
      const { nftId, editionId, quantity } = parsed.data

      const found = db.read((s) => findEdition(s, nftId, editionId))
      if (!found) return errors.notFound('NFT_NOT_FOUND', 'Este NFT ou edição não existe.')
      const limit = quantityLimit(found.edition)
      const existing = db.read((s) => findCart(s, owner.ownerKey).lines.find((l) => l.editionId === editionId))
      const total = (existing?.quantity ?? 0) + quantity
      if (total > limit) return limitError(limit)

      return json(
        updateCart(owner.ownerKey, (cart) => {
          const line = cart.lines.find((l) => l.editionId === editionId)
          if (line) line.quantity = total
          else cart.lines.push({ id: randomId('item'), nftId, editionId, quantity, notice: null })
        }),
      )
    }),
  ),

  http.patch<{ itemId: string }>(
    '*/api/cart/items/:itemId',
    withNetwork('cart.update', async ({ request, params }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const parsed = UpdateCartItemInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return errors.validation(zodFields(parsed.error))

      const line = db.read((s) => findCart(s, owner.ownerKey).lines.find((l) => l.id === params.itemId))
      if (!line) return errors.notFound('CART_ITEM_NOT_FOUND', 'Este item não está mais no carrinho.')
      const found = db.read((s) => findEdition(s, line.nftId, line.editionId))
      if (!found) return errors.notFound('NFT_NOT_FOUND', 'Este NFT não existe mais.')
      const limit = quantityLimit(found.edition)
      if (parsed.data.quantity > limit) return limitError(limit)

      return json(
        updateCart(owner.ownerKey, (cart) => {
          const target = cart.lines.find((l) => l.id === params.itemId)!
          target.quantity = parsed.data.quantity
          target.notice = null
        }),
      )
    }),
  ),

  http.delete<{ itemId: string }>(
    '*/api/cart/items/:itemId',
    withNetwork('cart.remove', ({ request, params }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const exists = db.read((s) => findCart(s, owner.ownerKey).lines.some((l) => l.id === params.itemId))
      // Removing twice is fine (idempotent): answer with the current cart.
      if (!exists) return json(db.read((s) => findCart(s, owner.ownerKey)))
      return json(
        updateCart(owner.ownerKey, (cart) => {
          cart.lines = cart.lines.filter((l) => l.id !== params.itemId)
        }),
      )
    }),
  ),

  http.put(
    '*/api/cart/coupon',
    withNetwork('cart.coupon', async ({ request }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const parsed = ApplyCouponInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return errors.validation({ couponCode: parsed.error.issues[0]?.message ?? 'Código inválido.' })
      const check = checkCoupon(parsed.data.code)
      if (!check.ok) return errors.validation({ couponCode: check.message }, check.message)
      return json(
        updateCart(owner.ownerKey, (cart) => {
          cart.couponCode = parsed.data.code
        }),
      )
    }),
  ),

  http.delete(
    '*/api/cart/coupon',
    withNetwork('cart.coupon', ({ request }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      return json(
        updateCart(owner.ownerKey, (cart) => {
          cart.couponCode = null
        }),
      )
    }),
  ),

  /** On login: move the guest cart into the user's, within stock limits. */
  http.post(
    '*/api/cart/merge',
    withNetwork('cart.merge', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const token = request.headers.get(CART_TOKEN_HEADER)
      const guestKey = token ? guestOwnerKey(token) : null
      const guest = guestKey ? db.read((s) => s.carts[guestKey]) : undefined
      const userKey = userOwnerKey(auth.user.id)
      const adjustments: CartMergeResponse['adjustments'] = []

      if (!guest || guest.lines.length === 0) {
        return HttpResponse.json<CartMergeResponse>({ cart: toCartResponse(db.read((s) => findCart(s, userKey))), adjustments })
      }

      const merged = updateCart(userKey, (cart, s) => {
        for (const line of guest.lines) {
          const found = findEdition(s, line.nftId, line.editionId)
          if (!found) continue
          const limit = quantityLimit(found.edition)
          const target = cart.lines.find((l) => l.editionId === line.editionId)
          const requested = (target?.quantity ?? 0) + line.quantity
          const kept = Math.min(requested, limit)
          if (kept < requested) adjustments.push({ nftName: found.nft.name, requested, kept })
          if (kept === 0) {
            cart.lines = cart.lines.filter((l) => l.editionId !== line.editionId)
          } else if (target) {
            target.quantity = kept
          } else {
            cart.lines.push({ ...line, id: randomId('item'), quantity: kept })
          }
        }
        cart.couponCode ??= guest.couponCode
        delete s.carts[guestKey!]
      })
      return HttpResponse.json<CartMergeResponse>({ cart: toCartResponse(merged), adjustments })
    }),
  ),
]
