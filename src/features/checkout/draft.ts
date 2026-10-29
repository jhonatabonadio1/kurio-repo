import type { Chain } from '@/contracts/catalog'
import type { Buyer, CreateOrderInput } from '@/contracts/order'
import type { WalletType } from '@/contracts/wallet'

/**
 * Checkout choices kept in sessionStorage, so a session that expires in the
 * middle of the checkout comes back to the same form after login. Tied to
 * the user id: another user never sees it, and logout deletes it.
 */
export type CheckoutDraft = {
  userId: string
  buyer?: Partial<Buyer>
  walletId?: string
  network?: Chain
  provider?: WalletType
  /** Desktop: "Usar outra carteira?". */
  useOther?: boolean
  /** Desktop: "Observação do colecionador". */
  note?: string
  /**
   * Idempotency key for the order of this quote (survives refresh mid-submit).
   * `input` is kept only while the outcome is unknown (sent, no answer yet,
   * timeout, network error): resending it with the same key can only return
   * the order that already exists.
   */
  attempt?: { quoteId: string; key: string; input?: CreateOrderInput }
}

const KEY = 'kurio-checkout-draft'

export const checkoutDraft = {
  load(userId: string): CheckoutDraft {
    try {
      const raw = sessionStorage.getItem(KEY)
      const draft = raw ? (JSON.parse(raw) as CheckoutDraft) : null
      return draft?.userId === userId ? draft : { userId }
    } catch {
      return { userId }
    }
  },
  save(draft: CheckoutDraft) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(draft))
    } catch {
      // ignore
    }
  },
  update(userId: string, patch: Partial<CheckoutDraft>) {
    checkoutDraft.save({ ...checkoutDraft.load(userId), ...patch, userId })
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  },
}

export const shortAddress = (address: string) =>
  address.startsWith('0x') && address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
