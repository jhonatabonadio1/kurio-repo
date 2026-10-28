import type { Order } from '@/contracts/order'
import { db } from '../db/store'
import type { OrderRecord } from '../db/types'
import { publishNftUpdated, publishOrderUpdated } from '../realtime'
import { userOwnerKey } from './cart'
import { touchNft } from './nft'

/** Time the simulated chain takes to settle a payment. */
export const SETTLE_AFTER_MS = 3_000

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export const toOrderResponse = ({ userId: _u, quoteId: _q, settleAt: _s, plannedOutcome: _p, ...order }: OrderRecord): Order =>
  order

const randomHex = (length: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(length / 2)), (b) => b.toString(16).padStart(2, '0')).join('')

/**
 * Settles a pending order once (terminal states never change again).
 * Confirmed: stock goes down, the bought quantities leave the cart, and
 * nft.updated + order.updated are published. Rejected: nothing else moves.
 */
export function settleOrder(orderId: string) {
  timers.delete(orderId)
  const touchedNftIds = new Set<string>()
  const order = db.write((s) => {
    const record = s.orders[orderId]
    if (!record || record.status !== 'pending') return null
    const now = new Date().toISOString()

    if (record.plannedOutcome === 'rejected') {
      record.status = 'rejected'
      record.rejectReason = 'Pagamento recusado pela carteira. Nenhum valor foi cobrado.'
    } else {
      for (const line of record.receipt.lines) {
        const nft = s.nfts.find((n) => n.id === line.nftId)
        const edition = nft?.editions.find((e) => e.id === line.editionId)
        if (!nft || !edition) continue
        if (edition.supply !== null) edition.available = Math.max(0, edition.available - line.quantity)
        touchNft(nft)
        touchedNftIds.add(nft.id)
      }
      // Remove only what was bought (quantities added after the order stay).
      const cart = s.carts[userOwnerKey(record.userId)]
      if (cart) {
        for (const line of record.receipt.lines) {
          const cartLine = cart.lines.find((l) => l.editionId === line.editionId)
          if (cartLine) cartLine.quantity -= line.quantity
        }
        cart.lines = cart.lines.filter((l) => l.quantity > 0)
        cart.version += 1
      }
      record.status = 'confirmed'
      record.txHash = `0x${randomHex(64)}`
    }
    record.version += 1
    record.updatedAt = now
    return record
  })
  if (!order) return
  for (const id of touchedNftIds) {
    const nft = db.read((s) => s.nfts.find((n) => n.id === id))
    if (nft) publishNftUpdated(nft)
  }
  publishOrderUpdated(order)
}

export function scheduleSettlement(order: Pick<OrderRecord, 'id' | 'settleAt'>) {
  if (timers.has(order.id)) return
  const delay = Math.max(0, Date.parse(order.settleAt) - Date.now())
  timers.set(order.id, setTimeout(() => settleOrder(order.id), delay))
}

/**
 * After a refresh the timers are gone: settle what is overdue and
 * reschedule the rest. Called when the mock worker starts.
 */
export function resumePendingOrders() {
  const pending = db.read((s) => Object.values(s.orders).filter((o) => o.status === 'pending'))
  for (const order of pending) scheduleSettlement(order)
}

db.onReset(() => {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
})
