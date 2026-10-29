import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ChevronLeft, ShoppingCart } from 'lucide-react'

import { NftStrip } from '@/features/catalog/components/nft-strip'
import { trendingNftsQueryOptions } from '@/features/catalog/queries'
import { CartItems, CartItemsSkeleton } from '@/features/cart/components/cart-items'
import { CartSummary } from '@/features/cart/components/cart-summary'
import { cartQueryOptions, useCart } from '@/features/cart/queries'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/cart')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(cartQueryOptions())
  },
  component: CartPage,
})

function CartPage() {
  const cart = useCart()
  const router = useRouter()
  useDocumentTitle('Carrinho — Kurio')

  return (
    <div className="flex flex-col gap-16 pt-2 md:gap-24 md:pt-8">
      <div className="flex flex-col gap-7">
        {/* Mobile header (Figma "Screen Header"). */}
        <div className="relative flex h-11 items-center justify-center md:hidden">
          <button
            type="button"
            onClick={() => (router.history.canGoBack() ? router.history.back() : void router.navigate({ to: '/' }))}
            className="absolute left-0 grid size-[35px] place-items-center rounded-full bg-surface-dark/60 text-text-accent"
            aria-label="Voltar"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <h1 className="text-lg font-bold">Carrinho de NFTs</h1>
        </div>
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
            <li aria-hidden>/</li>
            <li aria-current="page">
              <h1 className="inline">Carrinho</h1>
            </li>
          </ol>
        </nav>

        {cart.isPending ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between" aria-busy="true" aria-label="Carregando carrinho">
            <CartItemsSkeleton />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ) : cart.isError ? (
          <div role="alert" className="flex flex-col items-center gap-4 rounded-lg bg-card px-6 py-16 text-center">
            <p className="text-lg font-bold">Não foi possível carregar o carrinho</p>
            <p className="text-sm text-text-secondary">{cart.error.message}</p>
            <Button onClick={() => void cart.refetch()}>Tentar novamente</Button>
          </div>
        ) : cart.data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg bg-card px-6 py-16 text-center">
            <ShoppingCart className="size-10 text-text-accent" aria-hidden />
            <p className="text-lg font-bold">Seu carrinho está vazio</p>
            <p className="max-w-sm text-sm text-text-secondary">Explore o catálogo e adicione NFTs para vê-los aqui.</p>
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar NFTs
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-10 max-md:pb-[360px] lg:grid-cols-[minmax(0,782px)_332px] lg:justify-between">
            <CartItems items={cart.data.items} />
            <CartSummary cart={cart.data} layout="desktop" />
            <CartSummary cart={cart.data} layout="mobile" />
          </div>
        )}
      </div>

      <div className="max-md:hidden">
        <AlsoViewed />
      </div>
    </div>
  )
}

/** "Colecionadores também viram": trending NFTs. */
function AlsoViewed() {
  const query = useQuery(trendingNftsQueryOptions())
  if (query.isError) return null
  return <NftStrip title="Colecionadores também viram" items={query.data?.items} />
}
