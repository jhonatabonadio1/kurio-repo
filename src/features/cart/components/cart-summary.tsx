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
 * desktop: the right column. mobile: a sheet fixed at the bottom (Figma mobile cart).
 */
export function CartSummary({ cart, layout }: { cart: Cart; layout: 'desktop' | 'mobile' }) {
  const quote = useQuery({ ...quoteQueryOptions(cart.version, 'ethereum'), enabled: cart.items.length > 0 })
  const navigate = useNavigate()
  const data = quote.data
  const conflict = quote.error instanceof ApiError && quote.error.status === 409
  const mobile = layout === 'mobile'

  const value = (amount: string | undefined, prefix = '', unit = true) =>
    amount === undefined ? <Skeleton className="inline-block h-4 w-24 align-middle" /> : `${prefix}${formatEth(amount, { unit })}`

  return (
    <section
      aria-labelledby={`summary-title-${layout}`}
      aria-busy={quote.isFetching}
      className={cn(
        'flex flex-col',
        mobile
          ? 'fixed inset-x-0 bottom-0 z-40 gap-4 rounded-t-[30px] bg-card px-6 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(10,6,4,0.45)] md:hidden'
          : 'hidden gap-6 md:flex',
      )}
    >
      <h2 id={`summary-title-${layout}`} className={cn('border-b border-border pb-3 text-xl leading-6 font-bold', mobile && 'sr-only')}>
        Resumo da carteira
      </h2>
      <div className={cn(mobile && 'mx-auto w-full max-w-[366px]')}>
        <CouponForm appliedCode={cart.couponCode} percentOff={data?.coupon?.percentOff} variant={mobile ? 'pill' : 'outline'} />
      </div>

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
        <dl className={cn('mx-auto flex w-full flex-col', mobile ? 'max-w-[366px] gap-1.5 text-[13px]' : 'gap-2 text-base')}>
          <Row mobile={mobile} label="Subtotal" value={value(data?.subtotal)} />
          <Row mobile={mobile} label="Desconto do lançamento" value={value(data?.discount, '(-) ', false)} />
          <Row mobile={mobile} label="Taxa de rede" value={value(data?.networkFee)} note="Taxa estimada" />
          <Row mobile={mobile} label="Total" value={value(data?.total)} strong className={mobile ? 'mt-2' : 'mt-6'} />
        </dl>
      )}

      <div className={cn('flex flex-col items-center gap-3', mobile && 'mx-auto w-full max-w-[366px]')}>
        {mobile ? (
          <button
            type="button"
            disabled={!data || quote.isFetching}
            onClick={() => void navigate({ to: '/checkout' })}
            className="h-[58px] w-full rounded-full bg-gradient-to-r from-primary to-[#b5743f] text-[15px] font-bold text-ink shadow-lg transition-opacity disabled:opacity-60"
          >
            Conectar e finalizar
          </button>
        ) : (
          <>
            <Button className="h-[45px] w-full text-base" disabled={!data || quote.isFetching} onClick={() => void navigate({ to: '/checkout' })}>
              Conectar e finalizar
            </Button>
            <Link to="/" hash="catalogo" className="py-1 text-base text-text-accent hover:text-foreground">
              Continuar explorando
            </Link>
          </>
        )}
      </div>
    </section>
  )
}

function Row({ label, value, note, strong = false, mobile, className }: { label: string; value: ReactNode; note?: string; strong?: boolean; mobile: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-baseline justify-between gap-x-4', className)}>
      <dt className={cn(strong && 'font-bold', strong && !mobile && 'text-lg')}>{label}</dt>
      <dd className={cn('text-right', mobile ? (strong ? 'text-base' : '') : 'text-xl', strong && 'font-bold text-text-accent')}>{value}</dd>
      {note && <dd className="w-full text-right text-xs text-text-accent">{note}</dd>}
    </div>
  )
}
