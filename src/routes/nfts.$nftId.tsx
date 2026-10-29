import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Heart } from 'lucide-react'

import { ApiError } from '@/contracts/api-error'
import { nftDetailQueryOptions } from '@/features/catalog/queries'
import { useAddToCart } from '@/features/cart/mutations'
import { useFavorite } from '@/features/favorites/use-favorite'
import { EditionPicker } from '@/features/nft-detail/components/edition-picker'
import { NftGallery } from '@/features/nft-detail/components/nft-gallery'
import { NftInfoTabs } from '@/features/nft-detail/components/nft-info-tabs'
import { MobileBuyBar, PurchaseActions, type PurchaseActionsProps } from '@/features/nft-detail/components/purchase-actions'
import { RatingStars } from '@/features/nft-detail/components/rating-stars'
import { RelatedNfts } from '@/features/nft-detail/components/related-nfts'
import { ShareLinks } from '@/features/nft-detail/components/share-links'
import { editionSlug, NftDetailSearchSchema, quantityLimit, resolveEdition } from '@/features/nft-detail/edition'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { cn } from '@/shared/lib/utils'
import { formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { toast } from '@/shared/ui/toaster'

export const Route = createFileRoute('/nfts/$nftId')({
  validateSearch: NftDetailSearchSchema,
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
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const { data: nft } = useSuspenseQuery(nftDetailQueryOptions(nftId))
  useDocumentTitle(`${nft.name} — Kurio`)

  const edition = resolveEdition(nft, search.edicao)
  const limit = quantityLimit(edition)
  const unavailable = edition.available === 0
  const requested = search.qtd ?? 1
  const quantity = unavailable ? 1 : Math.min(requested, limit)
  const clamped = !unavailable && requested > limit

  const addToCart = useAddToCart()
  const fav = useFavorite(nft.id, nft.name)
  const add = (then: 'cart' | 'stay') =>
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          toast(`${nft.name} (${quantity}×) adicionado ao carrinho.`, 'success')
          if (then === 'cart') void navigate({ to: '/cart' })
        },
      },
    )

  const setSearch = (patch: { edicao?: string; qtd?: number }) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false })

  const actions: PurchaseActionsProps = {
    name: nft.name,
    quantity,
    maxQuantity: limit,
    onQuantityChange: (qtd) => setSearch({ qtd: qtd === 1 ? undefined : qtd }),
    unitPrice: edition.price,
    unavailable,
    favorite: fav.favorite,
    onBuy: () => add('cart'),
    onAddToCart: () => add('stay'),
    busy: addToCart.isPending,
    onToggleFavorite: fav.toggle,
  }

  return (
    <div className="flex flex-col md:gap-24">
      <div className="flex flex-col gap-7 md:pt-8">
        <nav aria-label="Trilha de navegação" className="hidden text-base leading-4 text-foreground md:block">
          <ol className="flex gap-1">
            <li>
              <Link to="/" className="hover:text-text-accent">
                Início
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/" hash="catalogo" className="hover:text-text-accent">
                Mercado
              </Link>
            </li>
          </ol>
        </nav>

        <article className="grid md:gap-8 lg:grid-cols-[minmax(0,573px)_minmax(0,595px)] lg:justify-between">
          <div>
            {/* Figma mobile: back and favorite in their own row above the artwork. */}
            <div className="mb-2 flex justify-between md:hidden">
              <button
                type="button"
                onClick={() => (router.history.canGoBack() ? router.history.back() : void navigate({ to: '/' }))}
                className="grid size-[35px] place-items-center rounded-full bg-surface-dark/60 text-text-accent"
                aria-label="Voltar"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={fav.toggle}
                aria-pressed={fav.favorite}
                aria-label={fav.label}
                className="grid size-[35px] place-items-center rounded-full bg-surface-dark/60 text-text-accent"
              >
                <Heart className={cn('size-[18px]', fav.favorite && 'fill-current')} aria-hidden />
              </button>
            </div>
            <NftGallery images={nft.gallery} name={nft.name} />
          </div>

          {/* Mobile: a sheet with rounded top corners over the bottom of the artwork. */}
          <div className="relative z-10 -mx-6 -mt-9 flex flex-col gap-5 rounded-t-[30px] bg-card px-6 pt-6 pb-56 md:mx-0 md:mt-0 md:gap-6 md:rounded-none md:bg-transparent md:p-0 lg:justify-between lg:gap-4">
            <header className="flex flex-col gap-3 md:border-b md:border-border md:pb-3">
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-xl font-bold md:text-[28px] md:leading-tight">{nft.name}</h1>
                <span className="md:hidden">
                  <RatingStars average={nft.rating.average} count={nft.rating.count} compact />
                </span>
              </div>
              <div className="hidden items-center justify-between gap-4 md:flex">
                <p className="flex items-baseline gap-3 text-[22px] leading-4 font-bold text-text-accent">
                  <span className="sr-only">Preço da edição selecionada: </span>
                  {formatEth(edition.price)}
                </p>
                <RatingStars average={nft.rating.average} count={nft.rating.count} />
              </div>
            </header>

            <section aria-labelledby="about-title" className="flex flex-col gap-3">
              <h2 id="about-title" className="text-[15px] leading-4 font-bold max-md:sr-only">
                Sobre este NFT:
              </h2>
              <p className="text-sm leading-6 text-text-secondary">{nft.about}</p>
            </section>

            <div className="flex flex-col gap-2">
              <EditionPicker
                name="edition"
                editions={nft.editions}
                selectedId={edition.id}
                onSelect={(e) => setSearch({ edicao: editionSlug(e.kind), qtd: undefined })}
              />
              <p role="status" className={cn('min-h-5 text-sm text-text-secondary', !unavailable && !clamped && 'max-md:sr-only')}>
                {unavailable
                  ? 'Esta edição está esgotada. Escolha outra edição.'
                  : clamped
                    ? `A quantidade foi ajustada para o máximo de ${limit} desta edição.`
                    : edition.supply === null
                      ? `Edição aberta · até ${limit} por pedido`
                      : `${edition.available} de ${edition.supply} disponíveis · até ${limit} por pedido`}
              </p>
            </div>

            <PurchaseActions {...actions} />

            <div className="flex flex-col gap-3">
              <dl className="flex flex-col gap-3 text-[15px] text-brand-secondary">
                <div className="flex gap-1">
                  <dt>ID do token:</dt>
                  <dd>{nft.tokenId}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Coleção:</dt>
                  <dd>{nft.collection}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Atributos:</dt>
                  <dd>{nft.attributes.join(', ')}</dd>
                </div>
              </dl>
              <div className="max-md:hidden">
                <ShareLinks name={nft.name} />
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="max-md:hidden">
        <NftInfoTabs nft={nft} />
      </div>
      <div className="max-md:hidden">
        <RelatedNfts collection={nft.collection} excludeId={nft.id} />
      </div>
      <MobileBuyBar {...actions} />
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 pt-8 lg:grid-cols-2" aria-busy="true" aria-label="Carregando NFT">
      <div className="flex gap-7">
        <div className="hidden flex-col gap-4 md:flex">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="size-[100px]" />
          ))}
        </div>
        <Skeleton className="aspect-square w-full max-w-[444px] rounded-none" />
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-7 w-60" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-20 w-2/3" />
      </div>
    </div>
  )
}

function NftNotFound() {
  useDocumentTitle('NFT não encontrado — Kurio')
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
