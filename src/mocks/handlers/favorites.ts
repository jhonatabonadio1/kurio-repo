import { http, HttpResponse } from 'msw'

import { NftSummarySchema } from '@/contracts/catalog'
import type { FavoriteItems, Favorites } from '@/contracts/favorites'
import { db } from '../db/store'
import { authenticate } from '../lib/auth'
import { errors } from '../lib/http'
import { withNetwork } from '../network'

const idsOf = (userId: string): Favorites => ({ nftIds: db.read((s) => [...(s.favorites[userId] ?? [])]) })

/**
 * PUT and DELETE are idempotent (adding twice or removing a missing id is
 * fine) and answer with the full list, so a retry can never double-toggle.
 * Scenario `favorite-error` fails them with 500 to show the rollback.
 */
export const favoriteHandlers = [
  http.get(
    '*/api/favorites',
    withNetwork('favorites.list', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      return HttpResponse.json(idsOf(auth.user.id))
    }),
  ),

  http.get(
    '*/api/favorites/items',
    withNetwork('favorites.items', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const items = db.read((s) =>
        [...(s.favorites[auth.user.id] ?? [])]
          .reverse()
          .map((id) => s.nfts.find((n) => n.id === id))
          .filter((nft) => nft !== undefined)
          .map((nft) => NftSummarySchema.parse(nft)),
      )
      return HttpResponse.json<FavoriteItems>({ items })
    }),
  ),

  http.put<{ nftId: string }>(
    '*/api/favorites/:nftId',
    withNetwork(
      'favorites.add',
      ({ request, params }) => {
        const auth = authenticate(request)
        if (auth instanceof Response) return auth
        if (!db.read((s) => s.nfts.some((n) => n.id === params.nftId))) {
          return errors.notFound('NFT_NOT_FOUND', 'Este NFT não existe.')
        }
        db.write((s) => {
          const list = (s.favorites[auth.user.id] ??= [])
          if (!list.includes(params.nftId)) list.push(params.nftId)
        })
        return HttpResponse.json(idsOf(auth.user.id))
      },
      { failOn: ['favorite-error'] },
    ),
  ),

  http.delete<{ nftId: string }>(
    '*/api/favorites/:nftId',
    withNetwork(
      'favorites.remove',
      ({ request, params }) => {
        const auth = authenticate(request)
        if (auth instanceof Response) return auth
        db.write((s) => {
          s.favorites[auth.user.id] = (s.favorites[auth.user.id] ?? []).filter((id) => id !== params.nftId)
        })
        return HttpResponse.json(idsOf(auth.user.id))
      },
      { failOn: ['favorite-error'] },
    ),
  ),
]
