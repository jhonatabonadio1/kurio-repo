import { FavoriteItemsSchema, FavoritesSchema } from '@/contracts/favorites'
import { getParsed, sendParsed } from '@/shared/api/client'

const path = (nftId: string) => `/favorites/${encodeURIComponent(nftId)}`

export const fetchFavorites = (signal?: AbortSignal) => getParsed('/favorites', FavoritesSchema, { signal })

export const fetchFavoriteItems = (signal?: AbortSignal) => getParsed('/favorites/items', FavoriteItemsSchema, { signal })

export const setFavorite = (nftId: string, favorite: boolean) =>
  sendParsed(favorite ? 'put' : 'delete', path(nftId), undefined, FavoritesSchema)
