import type { QueryClient } from '@tanstack/react-query'

import type { Cart } from '@/contracts/cart'
import type { NftDetail, NftListResponse, NftSummary } from '@/contracts/catalog'
import type { FavoriteItems } from '@/contracts/favorites'
import { isTerminalStatus, type Order } from '@/contracts/order'
import { NftUpdatedEventSchema, OrderUpdatedEventSchema, type NftUpdatedEvent } from '@/contracts/realtime'
import { catalogKeys } from '@/features/catalog/queries'
import { cartNotices } from '@/features/cart/notices'
import { cartKey } from '@/features/cart/queries'
import { orderKeys } from '@/features/orders/queries'
import { formatEth } from '@/shared/money/eth'
import { toast } from '@/shared/ui/toaster'

/**
 * Real-time pipeline. For every event:
 *   1. validate the envelope (zod) — anything else is dropped;
 *   2. drop duplicates by eventId;
 *   3. drop events older than what we already applied (version);
 *   4. update the cached resources; never call the API from here, except
 *      to refetch what the event says is out of date.
 */

const SEEN_LIMIT = 500
const seen = new Set<string>()
const nftVersions = new Map<string, number>()

function firstTime(eventId: string): boolean {
  if (seen.has(eventId)) return false
  seen.add(eventId)
  if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value!)
  return true
}

/** Exposed for the dev panel / tests. */
export const realtimeDebug = { seenCount: () => seen.size }

function patchSummary<T extends NftSummary>(item: T, event: NftUpdatedEvent): T {
  if (item.id !== event.resource.id || item.version >= event.version) return item
  return { ...item, price: event.data.price, previousPrice: event.data.previousPrice, soldOut: event.data.soldOut, version: event.version }
}

export function applyNftUpdated(queryClient: QueryClient, raw: unknown) {
  const parsed = NftUpdatedEventSchema.safeParse(raw)
  if (!parsed.success) return
  const event = parsed.data
  const id = event.resource.id
  if (!firstTime(event.eventId)) return
  if ((nftVersions.get(id) ?? 0) >= event.version) return
  nftVersions.set(id, event.version)

  queryClient.setQueryData<NftDetail>(catalogKeys.detail(id), (old) => {
    if (!old || old.version >= event.version) return old
    return {
      ...patchSummary(old, event),
      editions: old.editions.map((edition) => {
        const update = event.data.editions.find((e) => e.editionId === edition.id)
        return update ? { ...edition, price: update.price, available: update.available } : edition
      }),
    }
  })
  queryClient.setQueriesData<NftListResponse>({ queryKey: catalogKeys.all }, (old) =>
    old && 'items' in old ? { ...old, items: old.items.map((item) => patchSummary(item, event)) } : old,
  )
  // "Meus favoritos" holds summaries too: ['me', userId, 'favorites', 'items'].
  queryClient.setQueriesData<FavoriteItems>(
    { predicate: (q) => q.queryKey[0] === 'me' && q.queryKey[2] === 'favorites' && q.queryKey[3] === 'items' },
    (old) => (old ? { items: old.items.map((item) => patchSummary(item, event)) } : old),
  )

  // Items of this NFT in the cart: tell the user and price everything again.
  const cart = queryClient.getQueryData<Cart>(cartKey())
  const affected = cart?.items.filter((item) => item.nftId === id) ?? []
  for (const item of affected) {
    const update = event.data.editions.find((e) => e.editionId === item.editionId)
    if (!update) continue
    if (update.price !== item.unitPrice) {
      cartNotices.set(item.id, { kind: 'price', previousPrice: item.unitPrice, price: update.price, nftName: item.nft.name })
      toast(`Preço de ${item.nft.name} mudou de ${formatEth(item.unitPrice)} para ${formatEth(update.price)}.`, 'info')
    } else if (update.available < item.quantity) {
      cartNotices.set(item.id, { kind: 'availability', previousPrice: null, price: null, nftName: item.nft.name })
      toast(`Disponibilidade de ${item.nft.name} mudou: restam ${update.available}.`, 'info')
    }
  }
  // Cart and every quote of it (quotes live under the cart key).
  if (affected.length) void queryClient.invalidateQueries({ queryKey: cartKey() })
}

export function applyOrderUpdated(queryClient: QueryClient, raw: unknown, sessionUserId: string | null) {
  const parsed = OrderUpdatedEventSchema.safeParse(raw)
  if (!parsed.success) return
  const event = parsed.data
  // Another user's event (e.g. from a previous session) never touches this cache.
  if (!sessionUserId || event.data.userId !== sessionUserId) return
  if (!firstTime(event.eventId)) return

  const key = orderKeys.detail(sessionUserId, event.resource.id)
  const old = queryClient.getQueryData<Order>(key)
  if (old) {
    // Older than what we have, or the order already ended: ignore.
    if (old.version >= event.version || isTerminalStatus(old.status)) return
    queryClient.setQueryData<Order>(key, {
      ...old,
      status: event.data.status,
      txHash: event.data.txHash,
      rejectReason: event.data.rejectReason,
      version: event.version,
    })
  } else {
    void queryClient.invalidateQueries({ queryKey: key })
  }
  void queryClient.invalidateQueries({ queryKey: orderKeys.pending(sessionUserId) })

  if (event.data.status === 'confirmed') {
    // Bought quantities left the cart on the server.
    void queryClient.invalidateQueries({ queryKey: cartKey() })
    toast('Pagamento confirmado. Seus NFTs estão na sua carteira.', 'success')
  } else if (event.data.status === 'rejected') {
    toast('Pagamento recusado. Seus itens continuam no carrinho.', 'error')
  }
}

/** After a reconnect, events may have been missed: reload what is on screen. */
export function reconcileAfterReconnect(queryClient: QueryClient, sessionUserId: string | null) {
  void queryClient.invalidateQueries({ queryKey: catalogKeys.all, refetchType: 'active' })
  void queryClient.invalidateQueries({ queryKey: cartKey(), refetchType: 'active' })
  if (sessionUserId) void queryClient.invalidateQueries({ queryKey: orderKeys.all(sessionUserId) })
}
