import { http, HttpResponse, type DefaultBodyType } from 'msw'
import { z } from 'zod'

import {
  CATEGORIES,
  CatalogSortSchema,
  CatalogTabSchema,
  CategorySchema,
  CHAINS,
  ChainSchema,
  NftSummarySchema,
  type Category,
  type Chain,
  type NftDetail,
  type NftListResponse,
  type NftSummary,
} from '@/contracts/catalog'
import { EthAmountSchema } from '@/contracts/money'
import { eth } from '@/shared/money/eth'
import { getMockConfig } from '../config'
import { db } from '../db/store'
import { errors } from '../lib/http'
import { normalizeText } from '../lib/text'
import { withNetwork } from '../network'

/** "a,b,c" -> ["a", "b", "c"] */
const csvList = z.string().transform((v) => v.split(',').filter(Boolean))

/** GET /api/nfts query string (see contracts/catalog.ts › toNftListParams). */
const ListQuerySchema = z
  .object({
    q: z.string().trim().max(60).optional(),
    /** Exact collection name ("Mais desta coleção"). */
    collection: z.string().trim().max(60).optional(),
    tab: CatalogTabSchema.default('all'),
    category: csvList.pipe(z.array(CategorySchema)).optional(),
    chain: csvList.pipe(z.array(ChainSchema)).optional(),
    minPrice: EthAmountSchema.optional(),
    maxPrice: EthAmountSchema.optional(),
    sort: CatalogSortSchema.default('recent'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(9),
  })
  .refine((v) => !v.minPrice || !v.maxPrice || eth.cmp(v.minPrice, v.maxPrice) <= 0, {
    path: ['minPrice'],
    message: 'O preço mínimo não pode ser maior que o máximo.',
  })

const toSummary = (nft: NftDetail): NftSummary => NftSummarySchema.parse(nft)

const zeroCounts = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>

export const catalogHandlers = [
  http.get(
    '*/api/nfts',
    withNetwork(
      'nfts.list',
      ({ request }) => {
        const raw = Object.fromEntries(new URL(request.url).searchParams)
        const parsed = ListQuerySchema.safeParse(raw)
        if (!parsed.success) {
          return errors.badRequest(parsed.error.issues[0]?.message ?? 'Parâmetros de busca inválidos.')
        }
        const query = parsed.data
        const all = getMockConfig().scenario === 'empty' ? [] : db.read((s) => s.nfts)

        // Search and tab narrow everything, including the facet counts.
        const term = query.q ? normalizeText(query.q) : null
        const base = all.filter((nft) => {
          if (term) {
            const haystack = normalizeText(`${nft.name} ${nft.collection} ${nft.tokenId} ${nft.creator.name}`)
            if (!haystack.includes(term)) return false
          }
          if (query.collection && nft.collection !== query.collection) return false
          if (query.tab === 'new' && !nft.isNew) return false
          if (query.tab === 'trending' && !nft.trending) return false
          return true
        })

        const categories = zeroCounts<Category>(CATEGORIES)
        const chains = zeroCounts<Chain>(CHAINS)
        for (const nft of base) {
          categories[nft.category] += 1
          chains[nft.chain] += 1
        }

        const filtered = base.filter((nft) => {
          if (query.category && !query.category.includes(nft.category)) return false
          if (query.chain && !query.chain.includes(nft.chain)) return false
          if (query.minPrice && eth.cmp(nft.price, query.minPrice) < 0) return false
          if (query.maxPrice && eth.cmp(nft.price, query.maxPrice) > 0) return false
          return true
        })

        // Stable order: ties are broken by id, so pages never shuffle.
        const sorted = [...filtered].sort((a, b) => {
          const byId = a.id.localeCompare(b.id)
          switch (query.sort) {
            case 'price-asc':
              return eth.cmp(a.price, b.price) || byId
            case 'price-desc':
              return eth.cmp(b.price, a.price) || byId
            case 'name-asc':
              return a.name.localeCompare(b.name, 'pt-BR') || byId
            default:
              return b.listedAt.localeCompare(a.listedAt) || byId
          }
        })

        const { page, pageSize } = query
        const totalPages = Math.ceil(sorted.length / pageSize)
        const items = sorted.slice((page - 1) * pageSize, page * pageSize).map(toSummary)
        const prices = all.map((n) => n.price)

        return HttpResponse.json<NftListResponse>({
          items,
          page,
          pageSize,
          total: sorted.length,
          totalPages,
          facets: {
            categories,
            chains,
            // Slider bounds come from the whole catalog, so they stay put while filtering.
            priceRange: prices.length ? { min: eth.min(...prices), max: eth.max(...prices) } : { min: eth.zero, max: eth.zero },
          },
        })
      },
      { failOn: ['server-error'] },
    ),
  ),

  http.get<{ id: string }, DefaultBodyType, DefaultBodyType>(
    '*/api/nfts/:id',
    withNetwork(
      'nfts.detail',
      ({ params }) => {
        const nft = db.read((s) => s.nfts.find((n) => n.id === params.id))
        if (!nft) return errors.notFound('NFT_NOT_FOUND', 'Este NFT não existe ou foi removido.')
        return HttpResponse.json(nft)
      },
      { failOn: ['server-error'] },
    ),
  ),
]
