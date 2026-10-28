import type { NftDetail } from '@/contracts/catalog'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/contracts/realtime'
import { db } from './db/store'
import type { OrderRecord } from './db/types'

/**
 * Bridge between mock handlers and the mock Socket.IO server. Handlers call
 * publish*() after changing the DB; the browser setup attaches the server.
 * Without a server (Node checks) events are recorded but not delivered.
 */
type RealtimeServer = {
  broadcast: (event: string, payload: unknown) => void
  emitToUser: (userId: string, event: string, payload: unknown) => void
  disconnectAll: () => void
}

let server: RealtimeServer | null = null
/** Last events sent, for the control routes (replaying duplicates / old events). */
export const recentEvents: Array<{ kind: 'broadcast' | 'user'; userId?: string; event: NftUpdatedEvent | OrderUpdatedEvent }> = []

export function attachRealtimeServer(next: RealtimeServer) {
  server = next
}

function remember(entry: (typeof recentEvents)[number]) {
  recentEvents.push(entry)
  if (recentEvents.length > 50) recentEvents.shift()
}

export function nftUpdatedEvent(nft: NftDetail): NftUpdatedEvent {
  return {
    eventId: db.nextEventId('evt_nft'),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: {
      price: nft.price,
      previousPrice: nft.previousPrice,
      soldOut: nft.soldOut,
      editions: nft.editions.map((e) => ({ editionId: e.id, price: e.price, available: e.available })),
    },
  }
}

export function publishNftUpdated(nft: NftDetail) {
  const event = nftUpdatedEvent(nft)
  remember({ kind: 'broadcast', event })
  server?.broadcast(event.type, event)
  return event
}

export function publishOrderUpdated(order: OrderRecord) {
  const event: OrderUpdatedEvent = {
    eventId: db.nextEventId('evt_order'),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    data: { userId: order.userId, status: order.status, txHash: order.txHash, rejectReason: order.rejectReason },
  }
  remember({ kind: 'user', userId: order.userId, event })
  server?.emitToUser(order.userId, event.type, event)
  return event
}

/** Re-sends a recorded event as-is (duplicate / out-of-date tests). */
export function replayEvent(entry: (typeof recentEvents)[number]) {
  if (entry.kind === 'broadcast') server?.broadcast(entry.event.type, entry.event)
  else if (entry.userId) server?.emitToUser(entry.userId, entry.event.type, entry.event)
}

/** Drops every socket (clients reconnect and reconcile with REST). */
export function disconnectAllSockets() {
  server?.disconnectAll()
}
