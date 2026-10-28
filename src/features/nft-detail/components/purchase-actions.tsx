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

/** Mobile buy bar (Figma "Buy Bar"): Qtd. stepper, price, Comprar NFT and add-to-cart. */
export function MobileBuyBar(props: PurchaseActionsProps) {
  const { name, quantity, maxQuantity, onQuantityChange, unitPrice, unavailable, onBuy, onAddToCart, busy } = props
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] bg-card px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(10,6,4,0.45)] md:hidden">
      <div className="mx-auto flex max-w-[366px] flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden>
              Qtd.
            </span>
            <QuantityStepper
              size="sm"
              label={`Quantidade de ${name}`}
              value={quantity}
              max={Math.max(1, maxQuantity)}
              onChange={onQuantityChange}
              disabled={unavailable}
            />
          </div>
          <p className="text-lg font-bold text-text-accent">
            <span className="sr-only">Preço unitário: </span>
            {formatEth(unitPrice)}
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="xl" className="flex-1" onClick={onBuy} disabled={!onBuy || unavailable || busy}>
            Comprar NFT
          </Button>
          <Button
            size="xl"
            variant="outline"
            className="w-15 px-0"
            onClick={onAddToCart}
            disabled={!onAddToCart || unavailable || busy}
            aria-label="Adicionar ao carrinho"
          >
            <ShoppingCart className="size-5" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
