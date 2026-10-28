import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import * as React from 'react'

import { ApiError } from '@/contracts/api-error'
import type { Chain } from '@/contracts/catalog'
import type { Buyer } from '@/contracts/order'
import type { Quote } from '@/contracts/quote'
import type { WalletType } from '@/contracts/wallet'
import { quoteQueryOptions } from '@/features/cart/queries'
import { checkoutDraft } from './draft'
import { newIdempotencyKey, usePlaceOrder } from './use-place-order'

export type OrderDetails = { walletId: string; buyer: Buyer; note?: string }
export type Approval = OrderDetails & { quote: Quote; provider: WalletType; network: Chain }
export type SubmitError = { message: string; toCart: boolean }

const messageOf = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

/**
 * Everything "Confirmar compra" does, shared by the desktop and mobile layouts:
 * 1. collect the order details (desktop also saves the wallet form);
 * 2. price again (staleTime 0); a total different from the one on screen
 *    stops here and shows "Os valores mudaram" until the user accepts it;
 * 3. the simulated wallet asks to approve the payment;
 * 4. the order is created with an idempotency key kept per quote, so a
 *    double click, a refresh or a lost answer can only find the same order.
 * The purchase is confirmed only by the API (order page + socket event).
 */
export function useCheckoutFlow({ userId, cartVersion, network, provider }: { userId: string; cartVersion: number | undefined; network: Chain; provider: WalletType }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const quote = useQuery({ ...quoteQueryOptions(cartVersion ?? -1, network), enabled: cartVersion !== undefined })
  const placeOrder = usePlaceOrder()

  // The total the user agreed to, per network. The first quote of a network is
  // accepted as shown; any later change of total needs an explicit accept.
  const [accepted, setAccepted] = React.useState<{ network: Chain; total: string } | null>(null)
  const shown = quote.data
  if (shown && accepted?.network !== network) setAccepted({ network, total: shown.total })
  const acceptedTotal = accepted?.network === network ? accepted.total : null
  const quoteChanged = Boolean(shown && acceptedTotal && shown.total !== acceptedTotal)

  const [approval, setApproval] = React.useState<Approval | null>(null)
  const [preparing, setPreparing] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<SubmitError | null>(null)

  const acceptNewValues = () => shown && setAccepted({ network, total: shown.total })

  const confirm = async (collect: () => Promise<OrderDetails | null>) => {
    if (cartVersion === undefined) return
    setSubmitError(null)
    setPreparing(true)
    try {
      const details = await collect()
      if (!details) return
      const fresh = await queryClient.fetchQuery({ ...quoteQueryOptions(cartVersion, network), staleTime: 0 })
      // The cache now holds `fresh`: a different total shows the notice.
      if (acceptedTotal && fresh.total !== acceptedTotal) return
      setApproval({ ...details, quote: fresh, provider, network })
    } catch (e) {
      setSubmitError({
        message: messageOf(e, 'Não foi possível preparar o pedido. Tente novamente.'),
        toCart: e instanceof ApiError && e.status === 409,
      })
    } finally {
      setPreparing(false)
    }
  }

  const refuse = () => {
    setApproval(null)
    setSubmitError({ message: 'O pagamento foi recusado na carteira. Nada foi cobrado.', toCart: false })
  }

  const approve = () => {
    const pending = approval
    if (!pending) return
    setApproval(null)
    // One key per quote, kept across refreshes (sessionStorage).
    const saved = checkoutDraft.load(userId).attempt
    const key = saved?.quoteId === pending.quote.id ? saved.key : newIdempotencyKey()
    checkoutDraft.update(userId, { attempt: { quoteId: pending.quote.id, key } })
    placeOrder.mutate(
      {
        input: { quoteId: pending.quote.id, walletId: pending.walletId, network: pending.network, provider: pending.provider, buyer: pending.buyer, note: pending.note || undefined },
        idempotencyKey: key,
      },
      {
        onSuccess: (order) => {
          checkoutDraft.clear()
          void navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true })
        },
        onError: (error) => {
          const code = error instanceof ApiError ? error.code : ''
          setSubmitError({
            message:
              code === 'QUOTE_STALE'
                ? `${error.message} Confira o total e confirme de novo.`
                : error instanceof ApiError && !error.retryable
                  ? error.message
                  : 'Não recebemos a confirmação do pedido. Tente de novo: o mesmo pedido será recuperado, sem cobrança duplicada.',
            toCart: code === 'AVAILABILITY_CONFLICT',
          })
          if (code === 'QUOTE_STALE') void queryClient.invalidateQueries({ queryKey: quoteQueryOptions(cartVersion ?? -1, network).queryKey })
        },
      },
    )
  }

  return {
    quote,
    quoteChanged,
    acceptedTotal,
    acceptNewValues,
    confirm,
    approval,
    approve,
    refuse,
    submitError,
    setSubmitError,
    busy: preparing || placeOrder.isPending,
    placing: placeOrder.isPending,
  }
}

export type CheckoutFlow = ReturnType<typeof useCheckoutFlow>
