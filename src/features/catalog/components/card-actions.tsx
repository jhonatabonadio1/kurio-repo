import { Link } from '@tanstack/react-router'
import { Heart, Search, ShoppingCart } from 'lucide-react'

import type { NftSummary } from '@/contracts/catalog'
import { useAddToCart } from '@/features/cart/mutations'
import { useFavorite } from '@/features/favorites/use-favorite'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/ui/toaster'

const square = 'grid size-9 place-items-center rounded-md bg-ink/85 text-foreground transition-colors hover:text-text-accent disabled:opacity-50'

/**
 * Card actions from the Figma. Desktop: cart, favorite and zoom on hover or
 * keyboard focus, bottom-right of the artwork. Mobile: the heart, top-right.
 * They sit above the card's full-size link (z-10).
 */
export function CardActions({ nft }: { nft: NftSummary }) {
  const fav = useFavorite(nft.id, nft.name)
  const addToCart = useAddToCart()
  const canAdd = Boolean(nft.defaultEditionId) && !nft.soldOut

  const add = () => {
    if (!nft.defaultEditionId) return
    addToCart.mutate(
      { nftId: nft.id, editionId: nft.defaultEditionId, quantity: 1 },
      { onSuccess: () => toast(`${nft.name} adicionado ao carrinho.`, 'success') },
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={fav.toggle}
        aria-pressed={fav.favorite}
        aria-label={fav.label}
        className="absolute top-4 right-4 z-10 grid size-7 place-items-center rounded-full bg-ink/70 text-text-accent md:hidden"
      >
        <Heart className={cn('size-4', fav.favorite && 'fill-current')} aria-hidden />
      </button>
      <div className="absolute right-3 bottom-3 z-10 hidden gap-2.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none md:flex">
        <button type="button" className={square} onClick={add} disabled={!canAdd || addToCart.isPending} aria-label={`Adicionar ${nft.name} ao carrinho`}>
          <ShoppingCart className="size-5" aria-hidden />
        </button>
        <button type="button" className={square} onClick={fav.toggle} aria-pressed={fav.favorite} aria-label={fav.label}>
          <Heart className={cn('size-5', fav.favorite && 'fill-current text-text-accent')} aria-hidden />
        </button>
        <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className={square} aria-label={`Ver ${nft.name} em detalhe`} tabIndex={-1}>
          <Search className="size-5" aria-hidden />
        </Link>
      </div>
    </>
  )
}
