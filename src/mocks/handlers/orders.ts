import { http, HttpResponse } from 'msw'

import { CreateOrderInputSchema, OrderStatusSchema, type Order } from '@/contracts/order'
import { WALLET_TYPE_LABELS } from '@/contracts/wallet'
import { getMockConfig } from '../config'
import { db } from '../db/store'
import type { OrderRecord } from '../db/types'
import { authenticate } from '../lib/auth'
import { findCart, findEdition, quantityLimit, userOwnerKey } from '../lib/cart'
import { randomId } from '../lib/crypto'
import { errors } from '../lib/http'
import { touchNft } from '../lib/nft'
import { scheduleSettlement, SETTLE_AFTER_MS, toOrderResponse } from '../lib/orders'
import { readJson, zodFields } from '../lib/validation'
import { hang, withNetwork } from '../network'
import { publishNftUpdated } from '../realtime'

const IDEMPOTENCY_HEADER = 'Idempotency-Key'

/** Same content -> same string, whatever the key order. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

/** Keys whose first attempt already "timed out" (order-timeout scenario). */
const timedOutOnce = new Set<string>()

const stale = (message: string) => errors.conflict('QUOTE_STALE', message)

export const orderHandlers = [
  /**
   * POST /api/orders (Idempotency-Key required)
   * - same key + same body  -> the same order again (200)
   * - same key + other body -> 409 IDEMPOTENCY_KEY_REUSED
   * - quote expired, cart changed or an NFT changed since the quote -> 409 QUOTE_STALE
   * - stock no longer enough -> 409 AVAILABILITY_CONFLICT
   * The order starts "pending"; the simulated chain settles it later
   * (order.updated over Socket.IO, or GET /orders/:id).
   */
  http.post(
    '*/api/orders',
    withNetwork('orders.create', async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const key = request.headers.get(IDEMPOTENCY_HEADER)
      if (!key || !/^[A-Za-z0-9_-]{8,80}$/.test(key)) return errors.badRequest('Cabeçalho Idempotency-Key ausente ou inválido.')

      const body = await readJson(request)
      const bodyHash = stableStringify(body)
      const previous = db.read((s) => s.idempotency[key])
      if (previous) {
        if (previous.userId !== auth.user.id || previous.bodyHash !== bodyHash) {
          return errors.conflict('IDEMPOTENCY_KEY_REUSED', 'Esta chave de idempotência já foi usada com outro pedido.')
        }
        const order = db.read((s) => s.orders[previous.orderId])!
        return HttpResponse.json<Order>(toOrderResponse(order), { status: 200 })
      }

      const parsed = CreateOrderInputSchema.safeParse(body)
      if (!parsed.success) return errors.validation(zodFields(parsed.error))
      const { quoteId, walletId, network, buyer, provider, note } = parsed.data

      const quote = db.read((s) => s.quotes[quoteId])
      if (!quote || quote.ownerKey !== userOwnerKey(auth.user.id)) {
        return errors.notFound('QUOTE_NOT_FOUND', 'Cotação não encontrada. Revise o pedido novamente.')
      }
      if (quote.network !== network) return stale('A rede mudou desde a cotação. Revise o pedido.')
      if (Date.parse(quote.expiresAt) <= Date.now()) return stale('A cotação expirou. Revise os valores atualizados.')
      const cartVersion = db.read((s) => findCart(s, userOwnerKey(auth.user.id)).version)
      if (cartVersion !== quote.cartVersion) return stale('Seu carrinho mudou desde a cotação. Revise o pedido.')

      // Scenario: someone else buys the last units between quote and order.
      if (getMockConfig().scenario === 'sold-out') {
        const first = quote.lines[0]
        const nft = db.write((s) => {
          const target = s.nfts.find((n) => n.id === first?.nftId)
          const edition = target?.editions.find((e) => e.id === first?.editionId)
          if (!target || !edition) return null
          edition.available = 0
          touchNft(target)
          return target
        })
        if (nft) publishNftUpdated(nft)
      }

      const changed = db.read((s) =>
        quote.lines.filter((l) => s.nfts.find((n) => n.id === l.nftId)?.version !== quote.nftVersions[l.nftId]),
      )
      const short = db.read((s) =>
        quote.lines.filter((l) => {
          const found = findEdition(s, l.nftId, l.editionId)
          return !found || quantityLimit(found.edition) < l.quantity
        }),
      )
      if (short.length) {
        return errors.conflict(
          'AVAILABILITY_CONFLICT',
          `Sem estoque suficiente para: ${short.map((l) => l.name).join(', ')}. Ajuste o carrinho.`,
        )
      }
      if (changed.length) {
        return stale(`Preço ou disponibilidade mudou para: ${changed.map((l) => l.name).join(', ')}. Confirme os novos valores.`)
      }

      const wallet = db.read((s) => s.wallets.find((w) => w.id === walletId && w.userId === auth.user.id))
      if (!wallet) return errors.validation({ walletId: 'Escolha uma das suas carteiras cadastradas.' })

      const now = Date.now()
      const order: OrderRecord = {
        id: randomId('ord'),
        userId: auth.user.id,
        quoteId,
        status: 'pending',
        version: 1,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        network,
        wallet: { id: wallet.id, label: `${wallet.displayName} · ${WALLET_TYPE_LABELS[provider ?? wallet.walletType]}`, type: provider ?? wallet.walletType },
        buyer,
        note: note || null,
        txHash: null,
        rejectReason: null,
        receipt: {
          lines: quote.lines,
          subtotal: quote.subtotal,
          coupon: quote.coupon,
          discount: quote.discount,
          networkFee: quote.networkFee,
          total: quote.total,
        },
        settleAt: new Date(now + SETTLE_AFTER_MS).toISOString(),
        plannedOutcome: getMockConfig().scenario === 'payment-rejected' ? 'rejected' : 'confirmed',
      }
      db.write((s) => {
        s.orders[order.id] = order
        s.idempotency[key] = { key, userId: auth.user.id, bodyHash, orderId: order.id }
      })
      scheduleSettlement(order)

      // Scenario: the order exists, but this answer never arrives.
      if (getMockConfig().scenario === 'order-timeout' && !timedOutOnce.has(key)) {
        timedOutOnce.add(key)
        await hang()
      }
      return HttpResponse.json<Order>(toOrderResponse(order), { status: 201 })
    }),
  ),

  http.get(
    '*/api/orders',
    withNetwork('orders.list', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const status = OrderStatusSchema.safeParse(new URL(request.url).searchParams.get('status') ?? undefined)
      const orders = db.read((s) =>
        Object.values(s.orders)
          .filter((o) => o.userId === auth.user.id && (!status.success || o.status === status.data))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      )
      return HttpResponse.json({ orders: orders.map(toOrderResponse) })
    }),
  ),

  http.get<{ orderId: string }>(
    '*/api/orders/:orderId',
    withNetwork('orders.get', ({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const order = db.read((s) => s.orders[params.orderId])
      if (!order) return errors.notFound('ORDER_NOT_FOUND', 'Pedido não encontrado.')
      if (order.userId !== auth.user.id || getMockConfig().scenario === 'forbidden') return errors.forbidden()
      return HttpResponse.json<Order>(toOrderResponse(order))
    }),
  ),
]
