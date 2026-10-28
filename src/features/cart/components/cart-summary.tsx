import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import type { Cart } from '@/contracts/cart'
import { ApiError } from '@/contracts/api-error'
import { cn } from '@/shared/lib/utils'
import { formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { quoteQueryOptions } from '../queries'
import { CouponForm } from './coupon-form'

/**
 * Figma "Wallet Summary": coupon, subtotal, discount, network fee and total.
 * Every number comes from the API quote for this exact cart version.
 */
export function CartSummary({ cart }: { cart: Cart }) {
  const quote = useQuery({ ...quoteQueryOptions(cart.version, 'ethereum'), enabled: cart.items.length > 0 })
  const navigate = useNavigate()
  const data = quote.data
  const conflict = quote.error instanceof ApiError && quote.error.status === 409

  const value = (amount: string | undefined, prefix = '') =>
    amount === undefined ? <Skeleton className="h-4 w-24" /> : `${prefix}${formatEth(amount)}`

  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-6" aria-busy={quote.isFetching}>
      <h2 id="summary-title" className="hidden border-b border-border pb-3 text-base leading-4 font-bold md:block">
        Resumo da carteira
      </h2>
      <CouponForm appliedCode={cart.couponCode} percentOff={data?.coupon?.percentOff} />

      {data?.changes.some((c) => c.kind === 'coupon') && (
        <p role="status" className="text-sm text-text-accent">
          O cupom deixou de valer e foi desconsiderado.
        </p>
      )}

      {quote.isError ? (
        <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive/50 p-3 text-sm">
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            {quote.error.message}
          </p>
          {!conflict && (
            <Button size="sm" variant="outline" onClick={() => void quote.refetch()}>
              Tentar novamente
            </Button>
          )}
        </div>
      ) : (
        <dl className="flex flex-col gap-3 text-base">
          <Row label="Subtotal" value={value(data?.subtotal)} />
          <Row label="Desconto do lançamento" value={value(data?.discount, '(-) ')} />
          <Row label="Taxa de rede" value={value(data?.networkFee)} note="Taxa estimada" />
          <Row label="Total" value={value(data?.total)} strong className="mt-3" />
        </dl>
      )}

      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          className="h-10 w-full max-md:h-15 max-md:text-base"
          disabled={!data || quote.isFetching}
          onClick={() => void navigate({ to: '/checkout' })}
        >
          Conectar e finalizar
        </Button>
        <Link to="/" hash="catalogo" className="py-1 text-base text-text-secondary hover:text-foreground">
          Continuar explorando
        </Link>
      </div>
    </section>
  )
}

function Row({ label, value, note, strong = false, className }: { label: string; value: ReactNode; note?: string; strong?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-baseline justify-between gap-x-4', className)}>
      <dt className={cn(strong && 'font-bold')}>{label}</dt>
      <dd className={cn('text-right', strong && 'font-bold text-text-accent')}>{value}</dd>
      {note && <dd className="w-full text-right text-sm text-text-secondary">{note}</dd>}
    </div>
  )
}
