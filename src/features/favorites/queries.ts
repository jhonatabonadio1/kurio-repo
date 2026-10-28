import { queryOptions } from '@tanstack/react-query'

import { fetchFavoriteItems, fetchFavorites } from './api'

/** Private data: under ['me', userId], dropped on logout or user switch. */
export const favoriteKeys = {
  all: (userId: string) => ['me', userId, 'favorites'] as const,
  ids: (userId: string) => [...favoriteKeys.all(userId), 'ids'] as const,
  items: (userId: string) => [...favoriteKeys.all(userId), 'items'] as const,
}

export const favoritesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: favoriteKeys.ids(userId),
    queryFn: ({ signal }) => fetchFavorites(signal),
    staleTime: 5 * 60_000,
  })

export const favoriteItemsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: favoriteKeys.items(userId),
    queryFn: ({ signal }) => fetchFavoriteItems(signal),
    staleTime: 60_000,
  })
