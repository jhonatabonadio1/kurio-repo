/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Checks the client real-time pipeline (src/features/realtime/apply-events.ts)
 * against a real TanStack QueryClient: duplicates, old versions, other users'
 * events, terminal orders and cart notices.
 *
 * Run: pnpm verify:realtime
 */
import { QueryClient } from '@tanstack/react-query'

import type { NftDetail, NftListResponse } from '@/contracts/catalog'
import type { Order } from '@/contracts/order'
import { cartNotices } from '@/features/cart/notices'
import { cartKey } from '@/features/cart/queries'
import { catalogKeys } from '@/features/catalog/queries'
import { orderKeys } from '@/features/orders/queries'
import { applyNftUpdated, applyOrderUpdated } from '@/features/realtime/apply-events'
import { createNftFixtures } from '@/mocks/fixtures/nfts'

let passed = 0
let failed = 0
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) passed++
  else failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const qc = new QueryClient()
const nft = createNftFixtures()[0]! as NftDetail
const edition = nft.editions.find((e) => e.kind === '1/50')!
qc.setQueryData(catalogKeys.detail(nft.id), nft)
const listKey = [...catalogKeys.lists(), { page: '1' }]
qc.setQueryData<NftListResponse>(listKey, {
  items: [nft], page: 1, pageSize: 9, total: 1, totalPages: 1,
  facets: { categories: {} as any, chains: {} as any, priceRange: { min: nft.price, max: nft.price } },
})
qc.setQueryData(cartKey(), {
  items: [{ id: 'item_1', nftId: nft.id, editionId: edition.id, quantity: 1, unitPrice: edition.price, lineTotal: edition.price,
    nft: { name: nft.name, tokenId: nft.tokenId, image: nft.image }, edition: { kind: edition.kind, available: edition.available, maxPerOrder: 10 }, notice: null }],
  itemCount: 1, subtotal: edition.price, couponCode: null, version: 3,
})

const nftEvent = (eventId: string, version: number, price: string) => ({
  eventId, type: 'nft.updated', resource: { type: 'nft', id: nft.id }, version, occurredAt: new Date().toISOString(),
  data: { price: nft.price, previousPrice: null, soldOut: false, editions: [{ editionId: edition.id, price, available: 5 }] },
})
const detail = () => qc.getQueryData<NftDetail>(catalogKeys.detail(nft.id))!
const editionPrice = () => detail().editions.find((e) => e.id === edition.id)!.price

applyNftUpdated(qc, nftEvent('e1', 2, '2.50'))
check('newer nft.updated updates the detail cache', detail().version === 2 && editionPrice() === '2.50')
check('…and the catalog list cache', qc.getQueryData<NftListResponse>(listKey)!.items[0]!.version === 2)
check('…and flags the cart item (price notice)', cartNotices.get('item_1')?.previousPrice === edition.price)
applyNftUpdated(qc, nftEvent('e1', 9, '9.99'))
check('duplicate eventId is ignored', editionPrice() === '2.50' && detail().version === 2)
applyNftUpdated(qc, nftEvent('e2', 1, '0.01'))
check('older version is ignored', editionPrice() === '2.50')
applyNftUpdated(qc, { eventId: 'bad', type: 'nft.updated' })
check('malformed event is ignored', editionPrice() === '2.50')

const order: Order = {
  id: 'ord_1', status: 'pending', version: 1, createdAt: '', updatedAt: '', network: 'ethereum',
  wallet: { id: 'w', label: 'Principal', type: 'metamask' }, buyer: { fullName: 'Alice', email: 'alice@test.dev' },
  note: null, txHash: null, rejectReason: null,
  receipt: { lines: [], subtotal: '1' as any, coupon: null, discount: '0' as any, networkFee: '0.016' as any, total: '1.016' as any },
}
const key = orderKeys.detail('usr_alice', order.id)
qc.setQueryData(key, order)
const orderEvent = (eventId: string, version: number, status: string, userId = 'usr_alice') => ({
  eventId, type: 'order.updated', resource: { type: 'order', id: order.id }, version, occurredAt: new Date().toISOString(),
  data: { userId, status, txHash: status === 'confirmed' ? '0xabc' : null, rejectReason: null },
})
const status = () => qc.getQueryData<Order>(key)!.status

applyOrderUpdated(qc, orderEvent('o1', 2, 'confirmed', 'usr_bruno'), 'usr_alice')
check("another user's order.updated is ignored", status() === 'pending')
applyOrderUpdated(qc, orderEvent('o2', 2, 'confirmed'), null)
check('order.updated without a session is ignored', status() === 'pending')
applyOrderUpdated(qc, orderEvent('o3', 2, 'confirmed'), 'usr_alice')
check('pending -> confirmed applied', status() === 'confirmed' && qc.getQueryData<Order>(key)!.txHash === '0xabc')
applyOrderUpdated(qc, orderEvent('o4', 1, 'pending'), 'usr_alice')
check('older pending event cannot regress a confirmed order', status() === 'confirmed')
applyOrderUpdated(qc, orderEvent('o5', 3, 'rejected'), 'usr_alice')
check('terminal order never changes again', status() === 'confirmed')

console.log(`\n${passed}/${passed + failed} checks passed`)
process.exit(failed ? 1 : 0)
