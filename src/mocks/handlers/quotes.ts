import { http, HttpResponse } from 'msw'

import { NETWORK_FEES, QuoteRequestSchema, type Quote, type QuoteChange } from '@/contracts/quote'
import type { EthAmount } from '@/contracts/money'
import { eth } from '@/shared/money/eth'
import { db } from '../db/store'
import { checkCoupon, findCart, findEdition, resolveCartOwner, toCartResponse } from '../lib/cart'
import { randomId } from '../lib/crypto'
import { errors } from '../lib/http'
import { readJson, zodFields } from '../lib/validation'
import { withNetwork } from '../network'

const QUOTE_TTL_MS = 10 * 60_000

/**
 * POST /api/quotes: the price of the current cart right now. The client
 * never computes totals; it shows this. Stock problems are a 409 listing
 * the items to fix; a coupon that stopped working is dropped and reported
 * in `changes`.
 */
export const quoteHandlers = [
  http.post(
    '*/api/quotes',
    withNetwork('quotes.create', async ({ request }) => {
      const owner = resolveCartOwner(request)
      if (owner instanceof Response) return owner
      const parsed = QuoteRequestSchema.safeParse(await readJson(request))
      if (!parsed.success) return errors.validation(zodFields(parsed.error))
      const { network } = parsed.data

      const cartRecord = db.read((s) => findCart(s, owner.ownerKey))
      const cart = toCartResponse(cartRecord)
      if (cart.items.length === 0) return errors.conflict('CART_EMPTY', 'Seu carrinho está vazio.')

      const overLimit = cart.items.filter((i) => i.quantity > Math.min(i.edition.available, i.edition.maxPerOrder))
      if (overLimit.length) {
        const names = overLimit.map((i) => i.nft.name).join(', ')
        return errors.conflict('AVAILABILITY_CONFLICT', `Disponibilidade alterada para: ${names}. Ajuste as quantidades.`)
      }

      const changes: QuoteChange[] = []
      let coupon: Quote['coupon'] = null
      if (cart.couponCode) {
        const check = checkCoupon(cart.couponCode)
        if (check.ok) coupon = { code: cart.couponCode, percentOff: check.percentOff }
        else changes.push({ kind: 'coupon', nftName: null, from: cart.couponCode, to: null })
      }

      const subtotal = cart.subtotal
      const discount = (coupon ? eth.percentOf(subtotal, coupon.percentOff) : eth.zero) as EthAmount
      const networkFee = eth.of(NETWORK_FEES[network]) as EthAmount
      const quote: Quote = {
        id: randomId('qt'),
        cartVersion: cart.version,
        network,
        lines: cart.items.map((i) => ({
          cartItemId: i.id,
          nftId: i.nftId,
          editionId: i.editionId,
          name: i.nft.name,
          tokenId: i.nft.tokenId,
          editionKind: i.edition.kind,
          image: i.nft.image,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
        subtotal,
        coupon,
        discount,
        networkFee,
        total: eth.add(eth.sub(subtotal, discount), networkFee) as EthAmount,
        expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
        changes,
      }

      db.write((s) => {
        s.quotes[quote.id] = {
          ...quote,
          ownerKey: owner.ownerKey,
          nftVersions: Object.fromEntries(
            quote.lines.map((l) => [l.nftId, findEdition(s, l.nftId, l.editionId)?.nft.version ?? 0]),
          ),
        }
      })
      return HttpResponse.json<Quote>(quote)
    }),
  ),
]
