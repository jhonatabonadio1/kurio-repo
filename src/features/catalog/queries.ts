import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { toNftListParams, type CatalogSearch } from '@/contracts/catalog'
import { fetchNftDetail, fetchNftList } from './api'

/**
 * Public catalog data: not tied to a user, so it is shared across sessions.
 * The list key holds the exact API params, so a late answer for old params
 * can only land in its own cache entry, never on the screen for new ones.
 */
export const catalogKeys = {
  all: ['nfts'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (search: CatalogSearch) => [...catalogKeys.lists(), toNftListParams(search)] as const,
  details: () => [...catalogKeys.all, 'detail'] as const,
  detail: (id: string) => [...catalogKeys.details(), id] as const,
}

export const nftListQueryOptions = (search: CatalogSearch) =>
  queryOptions({
    queryKey: catalogKeys.list(search),
    // The signal cancels the request when the params change.
    queryFn: ({ signal }) => fetchNftList(search, signal),
    // Keep showing the previous page while the next one loads.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

export const nftDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: catalogKeys.detail(id),
    queryFn: ({ signal }) => fetchNftDetail(id, signal),
    staleTime: 30_000,
  })
