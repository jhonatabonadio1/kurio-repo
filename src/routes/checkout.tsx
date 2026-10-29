import { useIsMutating, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Loader2 } from 'lucide-react'
import * as React from 'react'

import { requireAuth } from '@/features/auth/guards'
import { useSession } from '@/features/auth/session'
import { cartQueryOptions, useCart } from '@/features/cart/queries'
import { DesktopCheckout } from '@/features/checkout/components/desktop-checkout'
import { MobileCheckout } from '@/features/checkout/components/mobile-checkout'
import { checkoutDraft } from '@/features/checkout/draft'
import { PLACE_ORDER_KEY, usePlaceOrder } from '@/features/checkout/use-place-order'
import { pendingOrdersQueryOptions } from '@/features/orders/queries'
import { walletsQueryOptions } from '@/features/wallets/queries'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/checkout')({
  beforeLoad: requireAuth,
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(cartQueryOptions())
    void context.queryClient.prefetchQuery(walletsQueryOptions(context.user.id))
  },
  component: CheckoutPage,
})

/** Desktop and mobile follow two different Figma frames; both share useCheckoutFlow. */
function CheckoutPage() {
  const context = Route.useRouteContext()
  const user = useSession().user ?? context.user
  const navigate = useNavigate()
  const router = useRouter()
  const desktop = useMediaQuery('(min-width: 1024px)')
  useDocumentTitle('Pagamento — Kurio')

  const cart = useCart()
  const wallets = useQuery(walletsQueryOptions(user.id))
  const pending = useQuery(pendingOrdersQueryOptions(user.id))
  const pendingOrder = pending.data?.orders[0]
  const placing = useIsMutating({ mutationKey: PLACE_ORDER_KEY }) > 0
  useRecoverOrder(user.id)

  const header = (
    <>
      <div className="relative flex h-11 items-center justify-center lg:hidden">
        <button
          type="button"
          onClick={() => (router.history.canGoBack() ? router.history.back() : void navigate({ to: '/cart' }))}
          className="absolute left-0 grid size-[35px] place-items-center rounded-full bg-surface-dark/60 text-text-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h1 className="text-lg font-bold">Pagamento com carteira</h1>
      </div>
      <nav aria-label="Trilha de navegação" className="hidden text-base leading-4 lg:block">
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
            <h1 className="inline">Pagamento</h1>
          </li>
        </ol>
      </nav>
    </>
  )

  if (cart.isPending || wallets.isPending) {
    return (
      <div className="flex flex-col gap-7 pb-10 lg:pt-8" aria-busy="true" aria-label="Carregando pagamento">
        {header}
        <div className="grid gap-[33px] lg:grid-cols-[minmax(0,1fr)_405px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  // The order may be confirmed (cart emptied) before its answer arrives.
  if (!cart.data?.items.length && placing) {
    return (
      <section role="status" className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
        <Loader2 className="size-12 animate-spin text-text-accent motion-reduce:animate-none" aria-hidden />
        <h1 className="text-2xl font-bold">Finalizando seu pedido…</h1>
        <p className="text-sm text-text-secondary">Estamos confirmando o pedido com a rede. Ele não será criado de novo.</p>
      </section>
    )
  }

  if (!cart.data?.items.length) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="text-sm text-text-secondary">Adicione NFTs ao carrinho para finalizar uma compra.</p>
        <Button asChild>
          <Link to="/" hash="catalogo">
            Explorar NFTs
          </Link>
        </Button>
      </div>
    )
  }

  const walletList = wallets.data?.wallets ?? []
  return (
    <div className="flex flex-col gap-7 pb-10 lg:gap-8 lg:pt-8">
      {header}
      {pendingOrder && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-4 py-3 text-sm">
          Você tem um pedido em processamento.
          <Link to="/orders/$orderId" params={{ orderId: pendingOrder.id }} className="font-bold text-text-accent underline">
            Acompanhar pedido
          </Link>
        </p>
      )}
      {desktop ? (
        <DesktopCheckout key={user.id} user={user} cart={cart.data} wallets={walletList} />
      ) : (
        <MobileCheckout key={user.id} user={user} cart={cart.data} wallets={walletList} />
      )}
    </div>
  )
}

/**
 * A request whose answer never came (timeout, network, refresh mid-submit) is
 * sent again once with the same idempotency key: the API answers with the
 * order it already has, and usePlaceOrder opens it. No new order is created.
 */
function useRecoverOrder(userId: string) {
  const placeOrder = usePlaceOrder()
  const { mutate } = placeOrder
  React.useEffect(() => {
    const attempt = checkoutDraft.load(userId).attempt
    if (attempt?.input) mutate({ input: attempt.input, idempotencyKey: attempt.key })
  }, [userId, mutate])
}
