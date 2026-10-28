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
