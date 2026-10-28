/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Checks the REST mock handlers in Node (same handlers the browser worker
 * uses): catalog filters, sort, pagination, errors and network scenarios.
 *
 * Run: pnpm verify:mocks
 */
import { setupServer } from 'msw/node'

import { NftListResponseSchema } from '@/contracts/catalog'
import { setMockConfig } from '@/mocks/config'
import { db } from '@/mocks/db/store'
import { restHandlers } from '@/mocks/handlers'
import { recentEvents } from '@/mocks/realtime'

const BASE = 'http://localhost:5173/api'
const server = setupServer(...restHandlers)
server.listen({ onUnhandledRequest: 'error' })

let passed = 0
let failed = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) passed++
  else failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const list = async (params: Record<string, string> = {}) => {
  const res = await fetch(`${BASE}/nfts?${new URLSearchParams(params)}`)
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

async function main() {
  setMockConfig({ scenario: 'default', latencyMs: 0 })

  // Catalog
  const first = await list()
  const parsed = NftListResponseSchema.safeParse(first.body)
  check('list matches the contract', parsed.success, parsed.success ? '' : parsed.error.message)
  const page1 = parsed.data!
  check('60 NFTs, 9 per page, 7 pages', page1.total === 60 && page1.items.length === 9 && page1.totalPages === 7)
  check('Figma order on "recent"', page1.items[0]?.id === 'emerald-ape-042' && page1.items[8]?.id === 'golden-signal-160')
  check('price range 0.02 – 12.3', page1.facets.priceRange.min === '0.02' && page1.facets.priceRange.max === '12.3')

  const last = NftListResponseSchema.parse((await list({ page: '7' })).body)
  check('last page has the remaining 6', last.items.length === 6)

  const combo = NftListResponseSchema.parse((await list({ category: 'musica,jogos', chain: 'ethereum,solana', pageSize: '48' })).body)
  check(
    'combined filters',
    combo.total > 0 && combo.items.every((n) => ['musica', 'jogos'].includes(n.category) && ['ethereum', 'solana'].includes(n.chain)),
    `${combo.total} results`,
  )
  check('facet counts ignore their own filter', combo.facets.categories.fotografia > 0)

  const asc = NftListResponseSchema.parse((await list({ sort: 'price-asc', pageSize: '48' })).body)
  check('sort price-asc', asc.items.every((n, i, a) => i === 0 || Number(a[i - 1]!.price) <= Number(n.price)))

  const ranged = NftListResponseSchema.parse((await list({ minPrice: '1', maxPrice: '2', pageSize: '48' })).body)
  check('price range filter', ranged.items.every((n) => Number(n.price) >= 1 && Number(n.price) <= 2), `${ranged.total} results`)

  const search = NftListResponseSchema.parse((await list({ q: 'GOLDEN' })).body)
  check('search is case-insensitive', search.total >= 2 && search.items.every((n) => /golden/i.test(n.name + n.collection)))

  const tabNew = NftListResponseSchema.parse((await list({ tab: 'new', pageSize: '48' })).body)
  check('tab "new"', tabNew.total > 0 && tabNew.items.every((n) => n.isNew))

  const kurio = NftListResponseSchema.parse((await list({ collection: 'Kurio Apes', pageSize: '48' })).body)
  check('collection filter', kurio.total > 0 && kurio.items.every((n) => n.collection === 'Kurio Apes'), `${kurio.total} results`)

  const bad = await list({ minPrice: '5', maxPrice: '1' })
  check('min > max -> 400', bad.status === 400)

  const detail = await fetch(`${BASE}/nfts/emerald-ape-042`)
  const nft = (await detail.json()) as { editions: unknown[] }
  check('detail 200 with 4 editions', detail.status === 200 && nft.editions.length === 4)
  const missing = await fetch(`${BASE}/nfts/nao-existe`)
  const missingBody = (await missing.json()) as { error: { code: string } }
  check('unknown NFT -> 404 NFT_NOT_FOUND', missing.status === 404 && missingBody.error.code === 'NFT_NOT_FOUND')

  // Auth
  const post = async (path: string, body: unknown, token?: string) => {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    })
    return { status: res.status, body: (res.status === 204 ? null : await res.json()) as Record<string, any> }
  }
  const session = async (token: string) => (await fetch(`${BASE}/auth/session`, { headers: { Authorization: `Bearer ${token}` } })).status

  const invalid = await post('/auth/register', { username: 'A', email: 'x', password: '123', confirmPassword: '321' })
  check('register: 422 with field errors', invalid.status === 422 && ['username', 'email', 'password'].every((f) => f in invalid.body.error.fields))
  const dup = await post('/auth/register', { username: 'alice2', email: 'ALICE@test.dev', password: 'Senha1234', confirmPassword: 'Senha1234' })
  check('register: duplicate e-mail -> 409 EMAIL_TAKEN', dup.status === 409 && dup.body.error.code === 'EMAIL_TAKEN' && Boolean(dup.body.error.fields.email))
  const created = await post('/auth/register', { username: 'carla', email: 'carla@test.dev', password: 'Senha1234', confirmPassword: 'Senha1234' })
  check('register: 201 with session', created.status === 201 && typeof created.body.token === 'string' && !('passwordHash' in created.body.user))
  const stored = db.read((s) => s.users.find((u) => u.email === 'carla@test.dev'))
  check('password stored only as a salted hash', Boolean(stored) && stored!.passwordHash !== 'Senha1234' && stored!.passwordHash.length === 64)

  const wrong = await post('/auth/login', { email: 'alice@test.dev', password: 'errada' })
  check('login: wrong password -> 401 INVALID_CREDENTIALS', wrong.status === 401 && wrong.body.error.code === 'INVALID_CREDENTIALS')
  const login = await post('/auth/login', { email: 'alice@test.dev', password: 'Test@1234' })
  const token = login.body.token as string
  check('login: alice@test.dev / Test@1234', login.status === 200 && login.body.user.id === 'usr_alice')
  check('session: valid token -> 200', (await session(token)) === 200)
  check('session: no token -> 401', (await fetch(`${BASE}/auth/session`)).status === 401)
  await post('/auth/logout', {}, token)
  check('logout ends the session', (await session(token)) === 401)

  setMockConfig({ scenario: 'session-expired' })
  const short = (await post('/auth/login', { email: 'bruno@test.dev', password: 'Test@1234' })).body.token as string
  const statuses = [await session(short), await session(short), await session(short)]
  check('scenario session-expired: 3rd request -> 401', statuses.join(',') === '200,200,401', statuses.join(','))
  setMockConfig({ scenario: 'register-conflict' })
  const conflict = await post('/auth/register', { username: 'dora', email: 'dora@test.dev', password: 'Senha1234', confirmPassword: 'Senha1234' })
  check('scenario register-conflict -> 409', conflict.status === 409)
  setMockConfig({ scenario: 'default' })

  // Cart, coupon, quote, merge
  const GUEST = 'guest-cart-token-0001'
  const api = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Cart-Token': GUEST, ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: res.status, body: (await res.json()) as Record<string, any> }
  }
  check('cart without token -> 400', (await fetch(`${BASE}/cart`)).status === 400)
  const emptyCart = await api('GET', '/cart')
  check('guest cart starts empty', emptyCart.status === 200 && emptyCart.body.itemCount === 0)

  const ape = 'emerald-ape-042'
  const ed = (kind: string) => `${ape}--${kind}`
  const added = await api('POST', '/cart/items', { nftId: ape, editionId: ed('1-50'), quantity: 2 })
  check('add 2 × 1/50 (1.78 each)', added.status === 200 && added.body.itemCount === 2 && added.body.subtotal === '3.56')
  const over = await api('POST', '/cart/items', { nftId: ape, editionId: ed('1-50'), quantity: 9 })
  check('add over maxPerOrder (10) -> 409 AVAILABILITY_CONFLICT', over.status === 409 && over.body.error.code === 'AVAILABILITY_CONFLICT')
  const itemId = added.body.items[0].id as string
  const updated = await api('PATCH', `/cart/items/${itemId}`, { quantity: 3 })
  check('update quantity', updated.status === 200 && updated.body.items[0].quantity === 3 && updated.body.version > added.body.version)
  await api('POST', '/cart/items', { nftId: ape, editionId: ed('aberta'), quantity: 1 })

  const invalidCoupon = await api('PUT', '/cart/coupon', { code: 'NADA' })
  check('coupon invalid -> 422 with field', invalidCoupon.status === 422 && invalidCoupon.body.error.fields.couponCode === 'Cupom inválido.')
  const expired = await api('PUT', '/cart/coupon', { code: 'old20' })
  check('coupon expired -> 422', expired.status === 422 && expired.body.error.fields.couponCode === 'Este cupom expirou.')
  const applied = await api('PUT', '/cart/coupon', { code: 'welcome10' })
  check('coupon WELCOME10 applied', applied.status === 200 && applied.body.couponCode === 'WELCOME10')

  const quote = await api('POST', '/quotes', { network: 'ethereum' })
  // 3 × 1.78 + 1 × 1.19 = 6.53; 10% = 0.653; fee 0.016 -> 5.893
  check(
    'quote: subtotal, discount, fee, total',
    quote.status === 200 && quote.body.subtotal === '6.53' && quote.body.discount === '0.653' && quote.body.networkFee === '0.016' && quote.body.total === '5.893',
    `${quote.body.subtotal} - ${quote.body.discount} + ${quote.body.networkFee} = ${quote.body.total}`,
  )
  const polygon = await api('POST', '/quotes', { network: 'polygon' })
  check('quote: polygon fee 0.002', polygon.body.networkFee === '0.002')
  await api('DELETE', '/cart/coupon')

  // Merge into Bruno's cart, which already holds 8 of the same edition (limit 10).
  const bruno = (await post('/auth/login', { email: 'bruno@test.dev', password: 'Test@1234' })).body.token as string
  const asBruno = { Authorization: `Bearer ${bruno}` }
  await api('POST', '/cart/items', { nftId: ape, editionId: ed('1-50'), quantity: 8 }, asBruno)
  const merge = await api('POST', '/cart/merge', undefined, asBruno)
  const line = merge.body.cart.items.find((i: any) => i.editionId === ed('1-50'))
  check(
    'merge keeps guest items within limits and reports adjustments',
    merge.status === 200 && line.quantity === 10 && merge.body.adjustments[0]?.kept === 10 && merge.body.adjustments[0]?.requested === 11,
  )
  check('guest cart is gone after merge', (await api('GET', '/cart')).body.itemCount === 0)
  const brunoCart = await api('GET', '/cart', undefined, asBruno)
  check('user cart wins over guest token when signed in', brunoCart.body.itemCount === 11)
  for (const item of brunoCart.body.items) await api('DELETE', `/cart/items/${item.id}`, undefined, asBruno)
  check('remove items', (await api('GET', '/cart', undefined, asBruno)).body.itemCount === 0)
  check('quote of an empty cart -> 409 CART_EMPTY', (await api('POST', '/quotes', { network: 'ethereum' }, asBruno)).status === 409)

  // Orders: idempotency, settlement, stale quotes, scenarios
  const alice = (await post('/auth/login', { email: 'alice@test.dev', password: 'Test@1234' })).body.token as string
  const asAlice = { Authorization: `Bearer ${alice}` }
  const buyer = { fullName: 'Alice Martins', email: 'alice@test.dev' }
  const order = (key: string | null, body: unknown, extra: Record<string, string> = {}, signal?: AbortSignal) =>
    fetch(`${BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...asAlice, ...(key ? { 'Idempotency-Key': key } : {}), ...extra },
      body: JSON.stringify(body),
      signal,
    }).then(async (r) => ({ status: r.status, body: (await r.json()) as Record<string, any> }))
  const stockOf = (editionId: string) => db.read((s) => s.nfts.flatMap((n) => n.editions).find((e) => e.id === editionId)!.available)
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const before = stockOf(ed('1-50'))
  await api('POST', '/cart/items', { nftId: ape, editionId: ed('1-50'), quantity: 2 }, asAlice)
  const q1 = (await api('POST', '/quotes', { network: 'ethereum' }, asAlice)).body
  const body1 = { quoteId: q1.id, walletId: 'wal_alice_primary', network: 'ethereum', buyer }
  check('order without Idempotency-Key -> 400', (await order(null, body1)).status === 400)
  const created1 = await order('key-alice-0001', body1)
  check('order created as pending (201)', created1.status === 201 && created1.body.status === 'pending')
  const replay = await order('key-alice-0001', body1)
  check('same key + same body -> same order (200)', replay.status === 200 && replay.body.id === created1.body.id)
  const reused = await order('key-alice-0001', { ...body1, network: 'polygon' })
  check('same key + other body -> 409 IDEMPOTENCY_KEY_REUSED', reused.status === 409 && reused.body.error.code === 'IDEMPOTENCY_KEY_REUSED')
  const brunoView = await fetch(`${BASE}/orders/${created1.body.id}`, { headers: asBruno })
  check("another user's order -> 403", brunoView.status === 403)

  await sleep(3_300)
  const settled = (await api('GET', `/orders/${created1.body.id}`, undefined, asAlice)).body
  check('settles to confirmed with a tx hash', settled.status === 'confirmed' && /^0x[0-9a-f]{64}$/.test(settled.txHash ?? ''))
  check('stock went down by 2', stockOf(ed('1-50')) === before - 2, `${before} -> ${stockOf(ed('1-50'))}`)
  check('bought items left the cart', (await api('GET', '/cart', undefined, asAlice)).body.itemCount === 0)
  check('receipt is the quote snapshot', settled.receipt.total === q1.total && settled.receipt.lines.length === 1)
  const sent = recentEvents.map((e) => e.event.type)
  check('published nft.updated and order.updated', sent.includes('nft.updated') && sent.includes('order.updated'))

  // Stale quote: the cart changed after quoting.
  await api('POST', '/cart/items', { nftId: ape, editionId: ed('aberta'), quantity: 1 }, asAlice)
  const q2 = (await api('POST', '/quotes', { network: 'ethereum' }, asAlice)).body
  await api('POST', '/cart/items', { nftId: ape, editionId: ed('aberta'), quantity: 1 }, asAlice)
  const stale = await order('key-alice-0002', { ...body1, quoteId: q2.id })
  check('cart changed after the quote -> 409 QUOTE_STALE', stale.status === 409 && stale.body.error.code === 'QUOTE_STALE')

  setMockConfig({ scenario: 'payment-rejected' })
  const q3 = (await api('POST', '/quotes', { network: 'ethereum' }, asAlice)).body
  const rejected = await order('key-alice-0003', { ...body1, quoteId: q3.id })
  await sleep(3_300)
  const rejectedNow = (await api('GET', `/orders/${rejected.body.id}`, undefined, asAlice)).body
  check('scenario payment-rejected: rejected, cart kept', rejectedNow.status === 'rejected' && (await api('GET', '/cart', undefined, asAlice)).body.itemCount === 2)

  setMockConfig({ scenario: 'order-timeout' })
  const q4 = (await api('POST', '/quotes', { network: 'ethereum' }, asAlice)).body
  const body4 = { ...body1, quoteId: q4.id }
  const timedOut = await order('key-alice-0004', body4, {}, AbortSignal.timeout(500)).then(() => 'answered', () => 'timeout')
  const retried = await order('key-alice-0004', body4)
  const pendingList = (await api('GET', '/orders?status=pending', undefined, asAlice)).body.orders as any[]
  check(
    'scenario order-timeout: retry with the same key returns the same order',
    timedOut === 'timeout' && retried.status === 200 && pendingList.filter((o) => o.id === retried.body.id).length === 1,
  )

  setMockConfig({ scenario: 'sold-out' })
  await sleep(3_300) // let the previous order settle first (it empties the cart)
  await api('POST', '/cart/items', { nftId: ape, editionId: ed('1-50'), quantity: 1 }, asAlice)
  const q5 = (await api('POST', '/quotes', { network: 'ethereum' }, asAlice)).body
  const soldOut = await order('key-alice-0005', { ...body1, quoteId: q5.id })
  check('scenario sold-out -> 409 AVAILABILITY_CONFLICT', soldOut.status === 409 && soldOut.body.error.code === 'AVAILABILITY_CONFLICT', soldOut.body.error?.code)
  setMockConfig({ scenario: 'default' })

  // Scenarios
  setMockConfig({ scenario: 'empty' })
  const empty = NftListResponseSchema.parse((await list()).body)
  check('scenario empty', empty.total === 0 && empty.items.length === 0)

  setMockConfig({ scenario: 'server-error' })
  check('scenario server-error -> 500', (await list()).status === 500)

  setMockConfig({ scenario: 'flaky' })
  const flaky1 = await list()
  const flaky2 = await list()
  check('scenario flaky: 503 then 200', flaky1.status === 503 && flaky2.status === 200)

  setMockConfig({ scenario: 'offline' })
  const offline = await fetch(`${BASE}/nfts`).then(() => 'answered', () => 'network error')
  check('scenario offline -> network error', offline === 'network error')

  setMockConfig({ scenario: 'out-of-order', latencyMs: 0 })
  const arrival: string[] = []
  await Promise.all([
    list({ q: 'first' }).then(() => arrival.push('first')),
    new Promise((r) => setTimeout(r, 20)).then(() => list({ q: 'second' })).then(() => arrival.push('second')),
  ])
  check('scenario out-of-order: newer answer arrives first', arrival.join(',') === 'second,first')

  setMockConfig({ scenario: 'slow' })
  const t0 = Date.now()
  await list()
  check('scenario slow ~2.5 s', Date.now() - t0 >= 2_400, `${Date.now() - t0} ms`)

  // Reset
  setMockConfig({ scenario: 'default', latencyMs: 0 })
  db.write((s) => {
    s.nfts = s.nfts.slice(0, 1)
  })
  await fetch('http://localhost:5173/__mocks/reset', { method: 'POST' })
  const afterReset = NftListResponseSchema.parse((await list()).body)
  check('reset restores the seed', afterReset.total === 60)
}

main()
  .catch((error) => check('unexpected error', false, String(error)))
  .finally(() => {
    server.close()
    console.log(`\n${passed}/${passed + failed} checks passed`)
    process.exit(failed ? 1 : 0)
  })
