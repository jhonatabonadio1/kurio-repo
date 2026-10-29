import { Link } from '@tanstack/react-router'
import { RefreshCw, TriangleAlert } from 'lucide-react'

import { formatEth } from '@/shared/money/eth'
import type { CheckoutFlow } from '../use-checkout-flow'

/** Price change, quote errors and order errors, right above "Confirmar compra". */
export function CheckoutNotices({ flow }: { flow: CheckoutFlow }) {
  const { quote, quoteChanged, acceptedTotal, submitError } = flow
  return (
    <>
      {quoteChanged && quote.data && acceptedTotal && (
        <div role="alert" className="flex flex-col gap-3 rounded-md border border-primary/60 bg-primary/10 p-3 text-sm">
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-text-accent" aria-hidden />
            <span>
              Os valores mudaram: o total foi de {formatEth(acceptedTotal)} para <strong>{formatEth(quote.data.total)}</strong>. Confira antes de confirmar.
            </span>
          </p>
          <button type="button" onClick={flow.acceptNewValues} className="flex items-center gap-1.5 self-start font-bold text-text-accent underline">
            <RefreshCw className="size-3.5" aria-hidden /> Aceitar os novos valores
          </button>
        </div>
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
          {submitError.retry && (
            <button type="button" onClick={flow.retry} disabled={flow.placing} className="self-start font-bold underline">
              Tentar de novo
            </button>
          )}
        </p>
      )}
    </>
  )
}
