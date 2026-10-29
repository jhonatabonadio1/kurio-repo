import { useSyncExternalStore } from 'react'

/**
 * Changes noticed in real time for items in the cart (price or stock),
 * shown next to the item until the user acts on it. Client-side only:
 * the cart itself always reflects current prices from the API.
 */
/** price = the new unit price from the event (shown before the cart refetch lands). */
export type CartNotice = { kind: 'price' | 'availability'; previousPrice: string | null; price: string | null; nftName: string }

let notices: ReadonlyMap<string, CartNotice> = new Map()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const cartNotices = {
  get: (itemId: string) => notices.get(itemId),
  set(itemId: string, notice: CartNotice) {
    notices = new Map(notices).set(itemId, notice)
    emit()
  },
  clear(itemId?: string) {
    if (itemId && !notices.has(itemId)) return
    const next = new Map(notices)
    if (itemId) next.delete(itemId)
    else next.clear()
    notices = next
    emit()
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export const useCartNotices = () => useSyncExternalStore(cartNotices.subscribe, () => notices, () => notices)
