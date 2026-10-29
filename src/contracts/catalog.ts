import { z } from 'zod'

import { EthAmountSchema } from './money'

// ---------- Enumerations (labels match the Figma) ----------

export const CATEGORIES = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
] as const
export const CategorySchema = z.enum(CATEGORIES)
export type Category = z.infer<typeof CategorySchema>
export const CATEGORY_LABELS: Record<Category, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

export const CHAINS = ['ethereum', 'polygon', 'solana'] as const
export const ChainSchema = z.enum(CHAINS)
export type Chain = z.infer<typeof ChainSchema>
export const CHAIN_LABELS: Record<Chain, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const EDITION_KINDS = ['1/1', '1/10', '1/50', 'aberta'] as const
export const EditionKindSchema = z.enum(EDITION_KINDS)
export type EditionKind = z.infer<typeof EditionKindSchema>
export const EDITION_LABELS: Record<EditionKind, string> = {
  '1/1': '1/1',
  '1/10': '1/10',
  '1/50': '1/50',
  aberta: 'ABERTA',
}

export const CATALOG_TABS = ['all', 'new', 'trending'] as const
export const CatalogTabSchema = z.enum(CATALOG_TABS)
export type CatalogTab = z.infer<typeof CatalogTabSchema>
export const CATALOG_TAB_LABELS: Record<CatalogTab, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const CATALOG_SORTS = ['recent', 'price-asc', 'price-desc', 'name-asc'] as const
export const CatalogSortSchema = z.enum(CATALOG_SORTS)
export type CatalogSort = z.infer<typeof CatalogSortSchema>
export const CATALOG_SORT_LABELS: Record<CatalogSort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  'name-asc': 'Nome (A–Z)',
}

export const CATALOG_PAGE_SIZE = 9

// ---------- Resources ----------

export const ImageSchema = z.object({
  /** Artwork key; the UI builds the responsive srcset from it. */
  key: z.string(),
  alt: z.string(),
})
export type NftImage = z.infer<typeof ImageSchema>

export const EditionSchema = z.object({
  id: z.string(),
  kind: EditionKindSchema,
  price: EthAmountSchema,
  /** null = open edition (no fixed supply). */
  supply: z.number().int().positive().nullable(),
  available: z.number().int().nonnegative(),
  maxPerOrder: z.number().int().positive(),
})
export type Edition = z.infer<typeof EditionSchema>

export const NftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  collection: z.string(),
  category: CategorySchema,
  chain: ChainSchema,
  image: ImageSchema,
  /** Lowest price among editions that still have stock (or among all, if sold out). */
  price: EthAmountSchema,
  /** Shown struck through when the price dropped. */
  previousPrice: EthAmountSchema.nullable(),
  soldOut: z.boolean(),
  /** Cheapest edition with stock: what the card's cart button adds. null when sold out. */
  defaultEditionId: z.string().nullable().default(null),
  isNew: z.boolean(),
  trending: z.boolean(),
  listedAt: z.iso.datetime(),
  /** Increases on every change; real-time events carry the same counter. */
  version: z.number().int().nonnegative(),
})
export type NftSummary = z.infer<typeof NftSummarySchema>

export const NftDetailSchema = NftSummarySchema.extend({
  description: z.string(),
  about: z.string(),
  attributes: z.array(z.string()),
  creator: z.object({ name: z.string(), royaltyPercent: z.number() }),
  contract: z.string(),
  gallery: z.array(ImageSchema).min(1),
  editions: z.array(EditionSchema).min(1),
  rating: z.object({ average: z.number(), count: z.number().int() }),
})
export type NftDetail = z.infer<typeof NftDetailSchema>

// ---------- List query (URL state = API params) ----------

const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined)
/** The URL carries lists as "a,b"; the app works with arrays. */
const commaList = (value: unknown) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value)

/**
 * Catalog state in the URL. Every field is optional and invalid values are
 * dropped (`.catch`) instead of crashing, so a hand-edited URL still loads.
 * Defaults are left out of the URL to keep links short.
 */
export const CatalogSearchSchema = z.object({
  q: optional(z.string().trim().min(1).max(60)),
  tab: optional(CatalogTabSchema),
  categories: optional(z.preprocess(commaList, z.array(CategorySchema).min(1))),
  chains: optional(z.preprocess(commaList, z.array(ChainSchema).min(1))),
  minPrice: optional(EthAmountSchema),
  maxPrice: optional(EthAmountSchema),
  sort: optional(CatalogSortSchema),
  page: optional(z.coerce.number().int().min(2)),
})
export type CatalogSearch = z.infer<typeof CatalogSearchSchema>

export const FacetsSchema = z.object({
  categories: z.record(CategorySchema, z.number().int()),
  chains: z.record(ChainSchema, z.number().int()),
  priceRange: z.object({ min: EthAmountSchema, max: EthAmountSchema }),
})
export type Facets = z.infer<typeof FacetsSchema>

export const NftListResponseSchema = z.object({
  items: z.array(NftSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  /** Counts respect search and tab, but not the category/network/price filters. */
  facets: FacetsSchema,
})
export type NftListResponse = z.infer<typeof NftListResponseSchema>

/** Query string sent to GET /api/nfts. Arrays are comma-separated. */
export function toNftListParams(search: CatalogSearch): Record<string, string> {
  const params: Record<string, string> = {
    page: String(search.page ?? 1),
    pageSize: String(CATALOG_PAGE_SIZE),
    sort: search.sort ?? 'recent',
    tab: search.tab ?? 'all',
  }
  if (search.q) params.q = search.q
  if (search.categories?.length) params.category = search.categories.join(',')
  if (search.chains?.length) params.chain = search.chains.join(',')
  if (search.minPrice) params.minPrice = search.minPrice
  if (search.maxPrice) params.maxPrice = search.maxPrice
  return params
}
