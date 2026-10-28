import type { Cart, CartItem } from '@/contracts/cart'
import type { Edition, NftDetail } from '@/contracts/catalog'
import type { EthAmount } from '@/contracts/money'
import { eth } from '@/shared/money/eth'
import { db } from '../db/store'
import type { CartLineRecord, CartRecord, MockDbState } from '../db/types'
import { authenticate, type AuthContext } from './auth'
import { errors } from './http'

/** Guest carts are identified by this header (a random id the browser keeps). */
export const CART_TOKEN_HEADER = 'X-Cart-Token'

export const userOwnerKey = (userId: string) => `user:${userId}`
export const guestOwnerKey = (token: string) => `guest:${token}`

export type CartOwner = { ownerKey: string; auth: AuthContext | null }

/**
 * Signed in -> the user's cart; otherwise the guest cart of X-Cart-Token.
 * A dead token is a 401 (the client signs out), never a silent guest cart.
 */
export function resolveCartOwner(request: Request): CartOwner | Response {
  if (request.headers.get('Authorization')) {
    const auth = authenticate(request)
    if (auth instanceof Response) return auth
    return { ownerKey: userOwnerKey(auth.user.id), auth }
  }
  const token = request.headers.get(CART_TOKEN_HEADER)
  if (!token || !/^[a-zA-Z0-9-]{8,64}$/.test(token)) return errors.badRequest('Cabeçalho X-Cart-Token ausente ou inválido.')
  return { ownerKey: guestOwnerKey(token), auth: null }
}

export const emptyCart = (ownerKey: string): CartRecord => ({ ownerKey, lines: [], couponCode: null, version: 0 })

export const findCart = (s: Readonly<MockDbState>, ownerKey: string) => s.carts[ownerKey] ?? emptyCart(ownerKey)

/** Mutates the cart in place (creating it) and bumps its version. */
export function updateCart(ownerKey: string, fn: (cart: CartRecord, s: MockDbState) => void): CartRecord {
  return db.write((s) => {
    const cart = (s.carts[ownerKey] ??= emptyCart(ownerKey))
    fn(cart, s)
    cart.version += 1
    return cart
  })
}

export const quantityLimit = (edition: Edition) => Math.min(edition.available, edition.maxPerOrder)

export function findEdition(s: Readonly<MockDbState>, nftId: string, editionId: string) {
  const nft = s.nfts.find((n) => n.id === nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  return nft && edition ? { nft, edition } : null
}

function toItem(line: CartLineRecord, nft: NftDetail, edition: Edition): CartItem {
  return {
    id: line.id,
    nftId: nft.id,
    editionId: edition.id,
    quantity: line.quantity,
    unitPrice: edition.price,
    lineTotal: eth.mul(edition.price, line.quantity),
    nft: { name: nft.name, tokenId: nft.tokenId, image: nft.image },
    edition: { kind: edition.kind, available: edition.available, maxPerOrder: edition.maxPerOrder },
    notice: line.notice,
  }
}

/** API view of a cart: current prices and stock from the catalog. */
export function toCartResponse(cart: CartRecord): Cart {
  const items = db.read((s) =>
    cart.lines.flatMap((line) => {
      const found = findEdition(s, line.nftId, line.editionId)
      return found ? [toItem(line, found.nft, found.edition)] : []
    }),
  )
  return {
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: (items.length ? eth.add(...items.map((i) => i.lineTotal)) : eth.zero) as EthAmount,
    couponCode: cart.couponCode,
    version: cart.version,
  }
}

export type CouponCheck = { ok: true; percentOff: number } | { ok: false; code: 'COUPON_INVALID' | 'COUPON_EXPIRED'; message: string }

export function checkCoupon(code: string): CouponCheck {
  const coupon = db.read((s) => s.coupons.find((c) => c.code === code.trim().toUpperCase()))
  if (!coupon) return { ok: false, code: 'COUPON_INVALID', message: 'Cupom inválido.' }
  if (Date.parse(coupon.expiresAt) <= Date.now()) return { ok: false, code: 'COUPON_EXPIRED', message: 'Este cupom expirou.' }
  return { ok: true, percentOff: coupon.percentOff }
}
