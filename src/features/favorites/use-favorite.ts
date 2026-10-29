import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'

import type { Favorites } from '@/contracts/favorites'
import { sessionQueryOptions, useSession } from '@/features/auth/session'
import { sessionStore } from '@/shared/auth/session-store'
import { toast } from '@/shared/ui/toaster'
import { setFavorite } from './api'
import { favoriteKeys, favoritesQueryOptions } from './queries'

const TOGGLE_KEY = ['favorites', 'toggle'] as const

type Variables = { userId: string; nftId: string; favorite: boolean }

const withFavorite = (data: Favorites | undefined, nftId: string, favorite: boolean): Favorites | undefined => {
  if (!data) return data
  const rest = data.nftIds.filter((id) => id !== nftId)
  return { nftIds: favorite ? [...rest, nftId] : rest }
}

/** Ids the signed-in user favorited (empty when signed out). */
export function useFavoriteIds(): ReadonlySet<string> {
  const { user } = useSession()
  const query = useQuery({ ...favoritesQueryOptions(user?.id ?? ''), enabled: Boolean(user), select: toSet })
  return query.data ?? EMPTY
}
const EMPTY: ReadonlySet<string> = new Set()
const toSet = (data: Favorites): ReadonlySet<string> => new Set(data.nftIds)

/**
 * Favorite toggle with an optimistic update:
 * - the heart changes at once (onMutate patches the cached ids);
 * - on error, only this NFT is put back (not a snapshot of the whole list,
 *   which would also undo other hearts toggled in the meantime) + a toast;
 * - toggles of the same NFT share a mutation scope, so they reach the API
 *   in click order (a fast like/unlike cannot end reversed on the server);
 * - when the last toggle settles, the list is refetched to match the server.
 * Signed out, the click goes to login and comes back here.
 */
export function useFavorite(nftId: string, nftName: string) {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })
  const favorite = useFavoriteIds().has(nftId)

  const mutation = useMutation<Favorites, Error, Variables>({
    mutationKey: TOGGLE_KEY,
    scope: { id: `favorite:${nftId}` },
    mutationFn: (v) => setFavorite(v.nftId, v.favorite),
    onMutate: async (v) => {
      // A refetch in flight would overwrite the optimistic value.
      await queryClient.cancelQueries({ queryKey: favoriteKeys.ids(v.userId) })
      queryClient.setQueryData<Favorites>(favoriteKeys.ids(v.userId), (old) => withFavorite(old, v.nftId, v.favorite))
    },
    onError: (_error, v) => {
      queryClient.setQueryData<Favorites>(favoriteKeys.ids(v.userId), (old) => withFavorite(old, v.nftId, !v.favorite))
      toast(
        v.favorite
          ? `Não foi possível favoritar ${nftName}. Tente novamente.`
          : `Não foi possível remover ${nftName} dos favoritos. Tente novamente.`,
        'error',
      )
    },
    onSettled: (_data, _error, v) => {
      // Other toggles still running would be overwritten by an early refetch.
      if (queryClient.isMutating({ mutationKey: TOGGLE_KEY }) === 1) {
        void queryClient.invalidateQueries({ queryKey: favoriteKeys.all(v.userId) })
      }
    },
  })

  const toLogin = () => {
    toast('Entre na sua conta para favoritar NFTs.', 'info')
    void navigate({ to: '/login', search: { redirect: href } })
  }

  /** Toggles from the real list: waits for it (deduplicated) when it has not loaded yet. */
  const toggleFor = (userId: string, renderedState: boolean | null) => {
    const cached = queryClient.getQueryData<Favorites>(favoriteKeys.ids(userId))
    if (cached) {
      // Synchronous path: fast repeated clicks alternate from what is on screen.
      mutation.mutate({ userId, nftId, favorite: !(renderedState ?? cached.nftIds.includes(nftId)) })
      return
    }
    queryClient.ensureQueryData(favoritesQueryOptions(userId)).then(
      (data) => mutation.mutate({ userId, nftId, favorite: !data.nftIds.includes(nftId) }),
      () => toast('Não foi possível carregar seus favoritos. Tente novamente.', 'error'),
    )
  }

  const toggle = () => {
    if (user) return toggleFor(user.id, favorite)
    // A token but no user yet: the session is still loading, not signed out.
    if (!sessionStore.token()) return toLogin()
    queryClient.ensureQueryData(sessionQueryOptions()).then(
      (session) => (session ? toggleFor(session.user.id, null) : toLogin()),
      () => toast('Não foi possível confirmar sua sessão. Tente novamente.', 'error'),
    )
  }

  // Stable name + aria-pressed carries the state (no label that flips).
  return { favorite, toggle, label: `Favoritar ${nftName}` }
}
