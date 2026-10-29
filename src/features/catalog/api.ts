import {
  NftDetailSchema,
  NftListResponseSchema,
  toNftListParams,
  type CatalogSearch,
} from '@/contracts/catalog'
import { getParsed } from '@/shared/api/client'

export const fetchNftList = (search: CatalogSearch, signal?: AbortSignal) =>
  getParsed('/nfts', NftListResponseSchema, { params: toNftListParams(search), signal })

/** Up to `limit` NFTs of one collection, newest first. */
export const fetchCollectionNfts = (collection: string, limit: number, signal?: AbortSignal) =>
  getParsed('/nfts', NftListResponseSchema, {
    params: { collection, pageSize: String(limit), page: '1', sort: 'recent', tab: 'all' },
    signal,
  })

export const fetchNftDetail = (id: string, signal?: AbortSignal) =>
  getParsed(`/nfts/${encodeURIComponent(id)}`, NftDetailSchema, { signal })

/** NFTs for the cart strip "Colecionadores também viram": the most recent listings. */
export const fetchTrendingNfts = (limit: number, signal?: AbortSignal) =>
  getParsed('/nfts', NftListResponseSchema, {
    params: { pageSize: String(limit), page: '1', sort: 'recent', tab: 'all' },
    signal,
  })
