import { z } from 'zod'

import { NftSummarySchema } from './catalog'

/** Ids only: enough to paint every heart on the screen. */
export const FavoritesSchema = z.object({
  nftIds: z.array(z.string()),
})
export type Favorites = z.infer<typeof FavoritesSchema>

/** The "Meus favoritos" page: summaries, most recently favorited first. */
export const FavoriteItemsSchema = z.object({
  items: z.array(NftSummarySchema),
})
export type FavoriteItems = z.infer<typeof FavoriteItemsSchema>
