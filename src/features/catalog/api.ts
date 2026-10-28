import {
  NftDetailSchema,
  NftListResponseSchema,
  toNftListParams,
  type CatalogSearch,
} from '@/contracts/catalog'
import { getParsed } from '@/shared/api/client'

export const fetchNftList = (search: CatalogSearch, signal?: AbortSignal) =>
  getParsed('/nfts', NftListResponseSchema, { params: toNftListParams(search), signal })

export const fetchNftDetail = (id: string, signal?: AbortSignal) =>
  getParsed(`/nfts/${encodeURIComponent(id)}`, NftDetailSchema, { signal })
