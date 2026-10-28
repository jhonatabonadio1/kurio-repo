import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'

import { ApiError } from '@/contracts/api-error'
import { EDITION_LABELS } from '@/contracts/catalog'
import { nftDetailQueryOptions } from '@/features/catalog/queries'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { NftArtwork } from '@/shared/ui/nft-artwork'
import { Skeleton } from '@/shared/ui/skeleton'

// First version of the detail page: direct access, 404 and real data.
// Gallery, edition/quantity pickers, favorites and buying come next.
export const Route = createFileRoute('/nfts/$nftId')({
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(nftDetailQueryOptions(params.nftId))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound()
      throw error
    }
  },
  pendingComponent: DetailSkeleton,
  notFoundComponent: NftNotFound,
  errorComponent: ({ error, reset }) => (
    <section role="alert" className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-2xl font-bold">Não foi possível carregar este NFT</h1>
      <p className="mt-3 text-sm text-text-secondary">{error instanceof Error ? error.message : 'Erro inesperado.'}</p>
      <Button className="mt-8" onClick={reset}>
        Tentar novamente
      </Button>
    </section>
  ),
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { data: nft } = useSuspenseQuery(nftDetailQueryOptions(nftId))
  useDocumentTitle(`${nft.name} — Kurio`)

  return (
    <article className="grid gap-10 pt-8 md:grid-cols-2">
      <NftArtwork image={nft.image} sizes="(min-width: 768px) 444px, 100vw" priority className="w-full max-w-[444px] rounded-[24px]" />
      <div className="flex flex-col gap-4">
        <nav aria-label="Trilha" className="text-sm text-text-secondary">
          <Link to="/" className="hover:text-foreground">
            Início
          </Link>{' '}
          / Mercado
        </nav>
        <h1 className="text-[32px] leading-tight font-bold">{nft.name}</h1>
        <p className="text-lg font-bold text-text-accent">{formatEth(nft.price)}</p>
        <p className="text-sm leading-6 text-text-secondary">{nft.about}</p>
        <ul className="flex flex-wrap gap-2" aria-label="Edições">
          {nft.editions.map((edition) => (
            <li key={edition.id} className="rounded-full border border-border px-3 py-1 text-sm">
              {EDITION_LABELS[edition.kind]} · {edition.available > 0 ? formatEth(edition.price) : 'indisponível'}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-10 pt-8 md:grid-cols-2" aria-busy="true" aria-label="Carregando NFT">
      <Skeleton className="aspect-square w-full max-w-[444px] rounded-[24px]" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  )
}

function NftNotFound() {
  return (
    <section className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-2xl font-bold">NFT não encontrado</h1>
      <p className="mt-3 text-sm text-text-secondary">Este NFT não existe ou foi removido do catálogo.</p>
      <Button asChild className="mt-8">
        <Link to="/" hash="catalogo">
          Ver catálogo
        </Link>
      </Button>
    </section>
  )
}
