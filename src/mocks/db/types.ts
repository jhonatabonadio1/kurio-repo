import type { CartItem } from '@/contracts/cart'
import type { NftDetail } from '@/contracts/catalog'
import type { Order } from '@/contracts/order'
import type { Quote } from '@/contracts/quote'
import type { CouponRecord, UserRecord, WalletRecord } from '../fixtures/accounts'

export type { CouponRecord, UserRecord, WalletRecord }

export type SessionRecord = {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
  /** Authenticated requests made with it (session-expired scenario). */
  uses: number
}

export type CartLineRecord = {
  id: string
  nftId: string
  editionId: string
  quantity: number
  notice: CartItem['notice']
}

/** Owner key: `user:<id>` or `guest:<cart token>`. */
export type CartRecord = { ownerKey: string; lines: CartLineRecord[]; couponCode: string | null; version: number }

export type QuoteRecord = Quote & {
  ownerKey: string
  /** NFT versions the quote was priced with; a newer version makes it stale. */
  nftVersions: Record<string, number>
}

export type OrderRecord = Order & {
  userId: string
  quoteId: string
  /** When the simulated chain settles the order, and how. */
  settleAt: string
  plannedOutcome: 'confirmed' | 'rejected'
}

export type IdempotencyRecord = { key: string; userId: string; bodyHash: string; orderId: string }

export type MockDbState = {
  schemaVersion: number
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: NftDetail[]
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  coupons: CouponRecord[]
  quotes: Record<string, QuoteRecord>
  orders: Record<string, OrderRecord>
  idempotency: Record<string, IdempotencyRecord>
  wallets: WalletRecord[]
  /** Monotonic counter for event ids. */
  eventSeq: number
}
