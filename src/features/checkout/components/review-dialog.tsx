import { CHAIN_LABELS } from '@/contracts/catalog'
import { WALLET_TYPE_LABELS } from '@/contracts/wallet'
import { formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import type { CheckoutFlow } from '../use-checkout-flow'

/**
 * "Revise o pedido" (brief: review before sending). Built from the fresh
 * quote: what the user confirms here is exactly what is sent.
 */
export function ReviewDialog({ flow }: { flow: CheckoutFlow }) {
  const review = flow.review
  return (
    <Dialog open={review !== null} onOpenChange={(open) => !open && flow.cancel()}>
      <DialogContent className="max-w-[520px]">
        {review && (
          <>
            <DialogHeader className="text-left">
              <DialogTitle>Revise o pedido</DialogTitle>
              <DialogDescription>Confira antes de confirmar. Os valores vêm da cotação mais recente.</DialogDescription>
            </DialogHeader>
            <ul aria-label="Itens" className="flex flex-col gap-2 border-y border-border py-3 text-sm">
              {review.quote.lines.map((line) => (
                <li key={line.cartItemId} className="flex justify-between gap-4">
                  <span className="min-w-0 truncate">
                    {line.name} <span className="text-text-secondary">(x {line.quantity})</span>
                  </span>
                  <span className="shrink-0 font-bold text-text-accent">{formatEth(line.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-text-secondary">Carteira</dt>
              <dd className="truncate text-right">{review.walletLabel}</dd>
              <dt className="text-text-secondary">Rede</dt>
              <dd className="text-right">{CHAIN_LABELS[review.network]}</dd>
              <dt className="text-text-secondary">Assinatura</dt>
              <dd className="text-right">{WALLET_TYPE_LABELS[review.provider]} (simulação)</dd>
              <dt className="text-text-secondary">Subtotal</dt>
              <dd className="text-right">{formatEth(review.quote.subtotal)}</dd>
              <dt className="text-text-secondary">{review.quote.coupon ? `Desconto (${review.quote.coupon.code})` : 'Desconto'}</dt>
              <dd className="text-right">(-) {formatEth(review.quote.discount)}</dd>
              <dt className="text-text-secondary">Taxa de rede</dt>
              <dd className="text-right">{formatEth(review.quote.networkFee)}</dd>
              <dt className="pt-1 text-base font-bold">Total</dt>
              <dd className="pt-1 text-right text-base font-bold text-text-accent">{formatEth(review.quote.total)}</dd>
            </dl>
            <DialogFooter className="sm:justify-end">
              <Button variant="outline" onClick={flow.cancel}>
                Voltar e editar
              </Button>
              <Button onClick={flow.submit}>Confirmar e pagar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
