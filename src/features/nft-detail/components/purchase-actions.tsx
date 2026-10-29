import { Heart, ShoppingCart } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'

export type PurchaseActionsProps = {
  name: string
  quantity: number
  maxQuantity: number
  onQuantityChange: (value: number) => void
  unitPrice: string
  unavailable: boolean
  favorite: boolean
  /** Undefined until the cart and favorites features are connected. */
  onBuy?: () => void
  onAddToCart?: () => void
  onToggleFavorite?: () => void
  busy?: boolean
}

/** Desktop row (Figma "Frame 167"): stepper, COMPRAR and Favoritar. */
export function PurchaseActions(props: PurchaseActionsProps) {
  const { name, quantity, maxQuantity, onQuantityChange, unavailable, favorite, onBuy, onToggleFavorite, busy } = props
  return (
    <div className="hidden flex-wrap items-center justify-between gap-4 md:flex">
      <QuantityStepper
        label={`Quantidade de ${name}`}
        value={quantity}
        max={Math.max(1, maxQuantity)}
        onChange={onQuantityChange}
        disabled={unavailable}
      />
      <div className="flex gap-2">
        <Button className="w-[130px] text-sm" onClick={onBuy} disabled={!onBuy || unavailable || busy}>
          COMPRAR
        </Button>
        <Button
          variant="outline"
          className={cn('w-[130px] text-sm font-medium', favorite && 'bg-primary/15')}
          onClick={onToggleFavorite}
          disabled={!onToggleFavorite}
          // The name stays "Favoritar"; aria-pressed and the filled heart carry the state.
          aria-pressed={favorite}
        >
          <Heart className={cn('size-5', favorite && 'fill-current')} aria-hidden />
          Favoritar
        </Button>
      </div>
    </div>
  )
}

/** Mobile buy bar (Figma "Buy Bar"): Qtd. stepper and price, the "Comprar NFT" pill and a round cart button. */
export function MobileBuyBar(props: PurchaseActionsProps) {
  const { name, quantity, maxQuantity, onQuantityChange, unitPrice, unavailable, onBuy, onAddToCart, busy } = props
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[30px] bg-card px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(10,6,4,0.45)] md:hidden">
      <div className="mx-auto flex max-w-[366px] flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-base text-text-secondary" aria-hidden>
              Qtd.
            </span>
            <QuantityStepper
              size="circle"
              label={`Quantidade de ${name}`}
              value={quantity}
              max={Math.max(1, maxQuantity)}
              onChange={onQuantityChange}
              disabled={unavailable}
            />
          </div>
          <p className="text-xl font-bold text-text-accent">
            <span className="sr-only">Preço unitário: </span>
            {formatEth(unitPrice)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBuy}
            disabled={!onBuy || unavailable || busy}
            className="h-[60px] w-[200px] rounded-full bg-gradient-to-r from-primary to-[#b5743f] text-base font-bold text-ink shadow-lg transition-opacity disabled:opacity-50"
          >
            Comprar NFT
          </button>
          <button
            type="button"
            onClick={onAddToCart}
            disabled={!onAddToCart || unavailable || busy}
            aria-label="Adicionar ao carrinho"
            className="grid size-[60px] place-items-center rounded-full bg-surface-dark/60 text-text-accent transition-colors hover:bg-surface-dark disabled:opacity-50"
          >
            <ShoppingCart className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
