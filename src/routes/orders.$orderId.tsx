import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { Loader2, ShieldX, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

import { ApiError } from '@/contracts/api-error'
import { CHAIN_LABELS } from '@/contracts/catalog'
import type { Order } from '@/contracts/order'
import { requireAuth } from '@/features/auth/guards'
import { OrderReceipt } from '@/features/orders/components/order-receipt'
import { orderQueryOptions } from '@/features/orders/queries'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { useRealtimeStatus } from '@/shared/realtime/status'
import { formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { RetryButton } from '@/shared/ui/retry-button'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: requireAuth,
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(orderQueryOptions(context.user.id, params.orderId))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound()
      throw error
    }
  },
  pendingComponent: () => (
    <div className="mx-auto w-full max-w-[578px] pt-10" aria-busy="true" aria-label="Carregando pedido">
      <Skeleton className="h-[520px] w-full rounded-xl" />
    </div>
  ),
  notFoundComponent: () => (
    <Message icon={XCircle} title="Pedido não encontrado" text="Confira o endereço ou veja seu carrinho.">
      <Button asChild>
        <Link to="/cart">Ver carrinho</Link>
      </Button>
    </Message>
  ),
  errorComponent: ({ error, reset }) =>
    error instanceof ApiError && error.status === 403 ? (
      <Message icon={ShieldX} title="Você não tem acesso a este pedido" text="Este pedido pertence a outra conta.">
        <Button asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
      </Message>
    ) : (
      <Message icon={XCircle} title="Não foi possível carregar o pedido" text={error instanceof Error ? error.message : ''}>
        <RetryButton reset={reset} />
      </Message>
    ),
  component: OrderPage,
})

function OrderPage() {
  const { user } = Route.useRouteContext()
  const { orderId } = Route.useParams()
  const { data: order } = useQuery(orderQueryOptions(user.id, orderId))
  useDocumentTitle(order?.status === 'confirmed' ? 'Pedido confirmado — Kurio' : 'Pedido — Kurio')
  if (!order) return null

  return (
    <div className="pt-6 md:pt-10">
      {/* The result is announced when it arrives over Socket.IO. */}
      <div aria-live="polite" className="sr-only">
        {order.status === 'confirmed' ? 'Pagamento confirmado.' : order.status === 'rejected' ? 'Pagamento recusado.' : ''}
      </div>
      {order.status === 'pending' && <Pending order={order} />}
      {order.status === 'confirmed' && <OrderReceipt order={order} />}
      {order.status === 'rejected' && (
        <Message icon={XCircle} title="Pagamento recusado" text={order.rejectReason ?? 'A carteira recusou o pagamento.'}>
          <p className="text-sm text-text-secondary">Seus itens continuam no carrinho. Nada foi cobrado.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/checkout">Tentar novamente</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/cart">Ver carrinho</Link>
            </Button>
          </div>
        </Message>
      )}
    </div>
  )
}

function Pending({ order }: { order: Order }) {
  const status = useRealtimeStatus()
  return (
    <section role="status" aria-labelledby="pending-title" className="mx-auto flex max-w-[578px] flex-col items-center gap-4 rounded-xl border-b-[10px] border-primary bg-card px-6 py-12 text-center">
      <Loader2 className="size-14 animate-spin text-text-accent motion-reduce:animate-none" aria-hidden />
      <h1 id="pending-title" className="text-lg font-bold">
        Aguardando confirmação na rede {CHAIN_LABELS[order.network]}
      </h1>
      <p className="max-w-sm text-sm leading-6 text-text-secondary">
        Pedido {order.id} · {formatEth(order.receipt.total)}. Você pode atualizar a página ou fechar a aba: o pedido
        continua sendo processado e não será criado de novo.
      </p>
      {status !== 'connected' && (
        <p className="text-sm text-text-accent">Reconectando ao tempo real… consultando o status periodicamente.</p>
      )}
    </section>
  )
}

function Message({ icon: Icon, title, text, children }: { icon: typeof XCircle; title: string; text: string; children?: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <Icon className="size-12 text-text-accent" aria-hidden />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-text-secondary">{text}</p>
      {children}
    </section>
  )
}
