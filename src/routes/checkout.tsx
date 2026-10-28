import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'

import { ApiError } from '@/contracts/api-error'
import type { Chain } from '@/contracts/catalog'
import { BuyerSchema, type Buyer } from '@/contracts/order'
import type { WalletType } from '@/contracts/wallet'
import { requireAuth } from '@/features/auth/guards'
import { cartQueryOptions, quoteQueryOptions, useCart } from '@/features/cart/queries'
import { CheckoutSection } from '@/features/checkout/components/checkout-section'
import { ConnectionPanel } from '@/features/checkout/components/connection-panel'
import { OrderSummary, QuoteChangedNotice } from '@/features/checkout/components/order-summary'
import { WalletPicker } from '@/features/checkout/components/wallet-picker'
import { checkoutDraft } from '@/features/checkout/draft'
import { newIdempotencyKey, usePlaceOrder } from '@/features/checkout/use-place-order'
import { useWalletConnection } from '@/features/checkout/use-wallet-connection'
import { pendingOrdersQueryOptions, walletsQueryOptions } from '@/features/orders/queries'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { TextField } from '@/shared/ui/text-field'

export const Route = createFileRoute('/checkout')({
  beforeLoad: requireAuth,
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(cartQueryOptions())
    void context.queryClient.prefetchQuery(walletsQueryOptions(context.user.id))
  },
  component: CheckoutPage,
})

type Reviewed = { quoteId: string; total: string }

function CheckoutPage() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  useDocumentTitle('Pagamento — Kurio')

  const draft = React.useMemo(() => checkoutDraft.load(user.id), [user.id])
  const cart = useCart()
  const wallets = useQuery(walletsQueryOptions(user.id))
  const pending = useQuery(pendingOrdersQueryOptions(user.id))

  // User choices; until the user picks, defaults come from the draft and the primary wallet.
  const [pickedWalletId, setWalletId] = React.useState(draft.walletId)
  const [pickedNetwork, setNetwork] = React.useState<Chain | undefined>(draft.network)
  const [pickedProvider, setProvider] = React.useState<WalletType | undefined>(draft.provider)
  const walletList = wallets.data?.wallets ?? []
  const wallet =
    walletList.find((w) => w.id === pickedWalletId) ?? walletList.find((w) => w.slot === 'primary') ?? walletList[0]
  const walletId = wallet?.id
  const network: Chain = pickedNetwork ?? wallet?.network ?? 'ethereum'
  const provider: WalletType = pickedProvider ?? wallet?.walletType ?? 'metamask'
  const connection = useWalletConnection([walletId, network, provider])
  const [reviewed, setReviewed] = React.useState<Reviewed | null>(null)
  const [submitError, setSubmitError] = React.useState<{ message: string; toCart: boolean } | null>(null)

  const form = useForm<Buyer>({
    resolver: zodResolver(BuyerSchema),
    defaultValues: { fullName: draft.buyer?.fullName ?? user.displayName, email: draft.buyer?.email ?? user.email },
  })

  // Keep the draft in sync (restored after an expired session).
  React.useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ values }) => checkoutDraft.update(user.id, { buyer: values }),
      }),
    [form, user.id],
  )
  React.useEffect(() => checkoutDraft.update(user.id, { walletId, network, provider }), [user.id, walletId, network, provider])

  const cartData = cart.data
  const quote = useQuery({ ...quoteQueryOptions(cartData?.version ?? -1, network), enabled: Boolean(cartData?.items.length) })
  const placeOrder = usePlaceOrder()

  const quoteChanged = reviewed && quote.data && quote.data.id !== reviewed.quoteId
  const connected = connection.state.status === 'connected'
  const canConfirm = Boolean(reviewed && quote.data && !quoteChanged && !quote.isFetching && connected && walletId && !placeOrder.isPending)

  const review = form.handleSubmit(async () => {
    setSubmitError(null)
    if (!walletId) return
    // Always price again right before showing the review.
    const fresh = await queryClient.fetchQuery({ ...quoteQueryOptions(cartData!.version, network), staleTime: 0 }).catch((e: unknown) => {
      setSubmitError({ message: e instanceof Error ? e.message : 'Não foi possível revisar o pedido.', toCart: e instanceof ApiError && e.status === 409 })
      return null
    })
    if (!fresh) return
    setReviewed({ quoteId: fresh.id, total: fresh.total })
    requestAnimationFrame(() => document.getElementById('review-title')?.focus())
  })

  const confirm = () => {
    if (!quote.data || !walletId) return
    setSubmitError(null)
    // One key per reviewed quote, kept across refreshes: a repeated click or a
    // resend after a timeout can only find the same order.
    const saved = checkoutDraft.load(user.id).attempt
    const key = saved?.quoteId === quote.data.id ? saved.key : newIdempotencyKey()
    checkoutDraft.update(user.id, { attempt: { quoteId: quote.data.id, key } })
    placeOrder.mutate(
      { input: { quoteId: quote.data.id, walletId, network, buyer: form.getValues() }, idempotencyKey: key },
      {
        onSuccess: (order) => {
          checkoutDraft.clear()
          void navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true })
        },
        onError: (error) => {
          setReviewed(null)
          const code = error instanceof ApiError ? error.code : ''
          setSubmitError({
            message:
              code === 'QUOTE_STALE'
                ? `${error.message} Revise o pedido de novo.`
                : error instanceof ApiError && !error.retryable
                  ? error.message
                  : 'Não recebemos a confirmação do pedido. Tente de novo: o mesmo pedido será recuperado, sem cobrança duplicada.',
            toCart: code === 'AVAILABILITY_CONFLICT',
          })
        },
      },
    )
  }

  if (cart.isPending || wallets.isPending) {
    return (
      <div className="grid gap-6 pt-8 lg:grid-cols-[minmax(0,1fr)_400px]" aria-busy="true" aria-label="Carregando pagamento">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (!cartData?.items.length) {
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

  const pendingOrder = pending.data?.orders[0]

  return (
    <div className="flex flex-col gap-7 pb-10 md:pt-8">
      <div className="relative flex h-11 items-center justify-center md:hidden">
        <button
          type="button"
          onClick={() => (router.history.canGoBack() ? router.history.back() : void navigate({ to: '/cart' }))}
          className="absolute left-0 grid size-[35px] place-items-center rounded-full bg-card"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="text-base font-bold">Pagamento com carteira</h1>
      </div>
      <nav aria-label="Trilha de navegação" className="hidden text-base leading-4 text-text-secondary md:block">
        <ol className="flex gap-1">
          <li>
            <Link to="/" className="hover:text-foreground">
              Início
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/cart" className="hover:text-foreground">
              Carrinho
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">
            <h1 className="inline">Pagamento</h1>
          </li>
        </ol>
      </nav>

      {pendingOrder && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-4 py-3 text-sm">
          Você tem um pedido em processamento.
          <Link to="/orders/$orderId" params={{ orderId: pendingOrder.id }} className="font-bold text-text-accent underline">
            Acompanhar pedido
          </Link>
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <form noValidate onSubmit={(e) => void review(e)} className="flex flex-col gap-6" id="checkout-form">
          <CheckoutSection step={1} title="Dados do colecionador" id="buyer-title">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Nome completo" autoComplete="name" error={form.formState.errors.fullName?.message} {...form.register('fullName')} />
              <TextField label="E-mail para o recibo" type="email" autoComplete="email" error={form.formState.errors.email?.message} {...form.register('email')} />
            </div>
          </CheckoutSection>

          <CheckoutSection step={2} title="Carteira que recebe os NFTs" id="wallet-title">
            <WalletPicker
              wallets={walletList}
              value={walletId}
              onChange={(wallet) => {
                setWalletId(wallet.id)
                setNetwork(wallet.network)
                setProvider(wallet.walletType)
              }}
            />
          </CheckoutSection>

          <CheckoutSection step={3} title="Rede e conexão" id="network-title">
            <ConnectionPanel network={network} onNetworkChange={setNetwork} provider={provider} onProviderChange={setProvider} connection={connection} />
          </CheckoutSection>
        </form>

        <aside aria-labelledby="review-title" className="flex flex-col gap-5 rounded-lg bg-card p-5 md:p-6 lg:sticky lg:top-6">
          <h2 id="review-title" tabIndex={-1} className="text-base leading-4 font-bold focus:outline-none">
            {reviewed ? 'Revise e confirme' : 'Resumo do pedido'}
          </h2>

          <OrderSummary quote={quote.data} loading={quote.isFetching} />

          {quoteChanged && reviewed && quote.data && (
            <QuoteChangedNotice previousTotal={reviewed.total} quote={quote.data} onAccept={() => setReviewed({ quoteId: quote.data!.id, total: quote.data!.total })} />
          )}
          {quote.isError && !submitError && (
            <p role="alert" className="text-sm text-destructive">
              {quote.error.message}
            </p>
          )}
          {submitError && (
            <p role="alert" className="flex flex-col gap-2 rounded-md border border-destructive/50 p-3 text-sm text-destructive">
              {submitError.message}
              {submitError.toCart && (
                <Link to="/cart" className="font-bold underline">
                  Ajustar carrinho
                </Link>
              )}
            </p>
          )}
          {!connected && reviewed && (
            <p role="status" className="text-sm text-text-secondary">
              Conecte a carteira para confirmar.
            </p>
          )}

          {!reviewed ? (
            <Button type="submit" form="checkout-form" size="lg" className="w-full max-md:h-15" disabled={!quote.data || quote.isFetching}>
              Revisar pedido
            </Button>
          ) : (
            <Button size="lg" className="w-full max-md:h-15" onClick={confirm} disabled={!canConfirm} aria-describedby="review-title">
              {placeOrder.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Enviando pedido…
                </>
              ) : (
                `Confirmar compra${quote.data ? ` · ${formatEth(quote.data.total)}` : ''}`
              )}
            </Button>
          )}
          {reviewed && (
            <button type="button" onClick={() => setReviewed(null)} className="text-sm text-text-secondary hover:text-foreground">
              Editar dados
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
