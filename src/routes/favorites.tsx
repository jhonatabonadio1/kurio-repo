import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { HeartOff, RefreshCw } from 'lucide-react'
import type * as React from 'react'

import { requireAuth } from '@/features/auth/guards'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { NFT_GRID_CLASS } from '@/features/catalog/components/nft-grid'
import { favoriteItemsQueryOptions, favoritesQueryOptions } from '@/features/favorites/queries'
import { useFavoriteIds } from '@/features/favorites/use-favorite'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/favorites')({
  beforeLoad: requireAuth,
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(favoritesQueryOptions(context.user.id))
    void context.queryClient.prefetchQuery(favoriteItemsQueryOptions(context.user.id))
  },
  component: FavoritesPage,
})

function FavoritesPage() {
  const { user } = Route.useRouteContext()
  useDocumentTitle('Meus favoritos — Kurio')
  const items = useQuery(favoriteItemsQueryOptions(user.id))
  const ids = useFavoriteIds()
  // Filtered by the (optimistic) ids: an unfavorited card leaves at once and
  // comes back if the request fails.
  const visible = items.data?.items.filter((nft) => ids.has(nft.id)) ?? []

  return (
    <div className="flex flex-col gap-8 pb-10 md:pt-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold md:text-[32px] md:leading-10">Meus favoritos</h1>
        {items.data && (
          <p className="text-sm text-text-secondary" aria-live="polite">
            {visible.length === 1 ? '1 NFT favoritado' : `${visible.length} NFTs favoritados`}
          </p>
        )}
      </header>

      {items.isPending ? (
        <div className={NFT_GRID_CLASS} aria-busy="true" aria-label="Carregando favoritos">
          {Array.from({ length: 3 }, (_, i) => (
            <NftCardSkeleton key={i} />
          ))}
        </div>
      ) : items.isError ? (
        <Empty
          icon={RefreshCw}
          role="alert"
          title="Não foi possível carregar seus favoritos"
          text={items.error.message}
          action={
            <Button onClick={() => void items.refetch()} disabled={items.isFetching}>
              {items.isFetching ? 'Tentando…' : 'Tentar novamente'}
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <Empty
          icon={HeartOff}
          title="Nenhum favorito ainda"
          text="Toque no coração de um NFT para guardá-lo aqui."
          action={
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar NFTs
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className={NFT_GRID_CLASS} aria-label="NFTs favoritados">
          {visible.map((nft, index) => (
            <li key={nft.id}>
              <NftCard nft={nft} priority={index < 3} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Empty({ icon: Icon, title, text, action, role }: { icon: typeof HeartOff; title: string; text: string; action: React.ReactNode; role?: 'alert' }) {
  return (
    <section role={role} className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-lg bg-card px-6 py-12 text-center">
      <Icon className="size-10 text-text-accent" aria-hidden />
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="max-w-sm text-sm leading-6 text-text-secondary">{text}</p>
      {action}
    </section>
  )
}
