import { Link } from '@tanstack/react-router'
import { Trash2, TriangleAlert } from 'lucide-react'

import type { CartItem } from '@/contracts/cart'
import { EDITION_LABELS } from '@/contracts/catalog'
import { cn } from '@/shared/lib/utils'
import { formatEth } from '@/shared/money/eth'
import { NftArtwork } from '@/shared/ui/nft-artwork'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'
import { Skeleton } from '@/shared/ui/skeleton'
import { useRemoveCartItem, useUpdateCartItem } from '../mutations'
import { cartNotices, useCartNotices } from '../notices'

const limitOf = (item: CartItem) => Math.min(item.edition.available, item.edition.maxPerOrder)
// Figma columns: NFTs · Preço · Edições · Total · delete
const COLUMNS = 'md:grid-cols-[minmax(0,1fr)_110px_110px_120px_32px] md:gap-6'

/**
 * Cart lines. One list for every size: a table-like grid from md (Figma
 * "Cart Table"), stacked cards below it (Figma mobile "Cart Items").
 */
export function CartItems({ items }: { items: CartItem[] }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const liveNotices = useCartNotices()
  const busy = (id: string) =>
    (update.isPending && update.variables?.itemId === id) || (remove.isPending && remove.variables === id)

  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden className={cn('hidden border-b border-border pb-3 text-base leading-4 font-bold md:grid', COLUMNS)}>
        <span>NFTs</span>
        <span>Preço</span>
        <span>Edições</span>
        <span>Total</span>
        <span />
      </div>
      <ul aria-label="Itens do carrinho" className="flex flex-col gap-5 md:gap-3">
        {items.map((item) => {
          const limit = limitOf(item)
          const overLimit = item.quantity > limit
          const live = liveNotices.get(item.id)
          const notice = live ?? item.notice
          return (
            <li
              key={item.id}
              aria-busy={busy(item.id)}
              className={cn(
                'relative grid grid-cols-[100px_1fr_auto] items-center gap-x-3 rounded-lg bg-card pr-4 transition-opacity md:rounded-none md:bg-transparent md:pr-0',
                COLUMNS,
                busy(item.id) && 'opacity-60',
              )}
            >
              <div className="row-span-2 flex items-center gap-4 md:row-span-1">
                <NftArtwork image={item.nft.image} sizes="100px" className="size-[100px] rounded-l-lg md:size-[70px] md:rounded-md" />
                <div className="hidden min-w-0 md:block">
                  <ItemName item={item} />
                  <p className="mt-1.5 text-sm text-text-secondary">ID do token: {item.nft.tokenId}</p>
                </div>
              </div>

              <div className="min-w-0 pt-3 md:hidden">
                <ItemName item={item} />
                <p className="mt-1.5 text-sm text-text-secondary">Edição: {EDITION_LABELS[item.edition.kind]}</p>
              </div>

              <p className="hidden md:block">
                <span className="sr-only">Preço unitário: </span>
                {formatEth(item.unitPrice)}
              </p>

              <div className="col-start-3 row-span-2 flex items-center gap-3 md:col-start-auto md:row-span-1">
                <QuantityStepper
                  size="sm"
                  label={`Quantidade de ${item.nft.name}`}
                  value={item.quantity}
                  max={Math.max(limit, 1)}
                  // Above the limit (stock fell) the user can still lower it.
                  min={1}
                  disabled={busy(item.id)}
                  onChange={(quantity) => update.mutate({ itemId: item.id, quantity })}
                />
                <button
                  type="button"
                  onClick={() => remove.mutate(item.id)}
                  disabled={busy(item.id)}
                  aria-label={`Remover ${item.nft.name} do carrinho`}
                  className="grid size-8 place-items-center rounded-md text-text-secondary transition-colors hover:text-destructive md:hidden"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </div>

              <p className="self-start pb-3 font-bold text-text-accent md:self-auto md:pb-0 md:font-normal md:text-foreground">
                <span className="sr-only">Total do item: </span>
                {formatEth(item.lineTotal)}
              </p>

              <button
                type="button"
                onClick={() => remove.mutate(item.id)}
                disabled={busy(item.id)}
                aria-label={`Remover ${item.nft.name} do carrinho`}
                className="hidden size-8 place-items-center rounded-md text-text-secondary transition-colors hover:text-destructive md:grid"
              >
                <Trash2 className="size-5" aria-hidden />
              </button>

              {(overLimit || notice) && (
                <p role="status" className="col-span-3 flex items-start gap-2 px-4 pb-3 text-sm text-text-accent md:col-span-5 md:px-0">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {overLimit ? (
                    <span>
                      {limit === 0 ? 'Esta edição esgotou. ' : `Só restam ${limit} disponíveis. `}
                      <button
                        type="button"
                        className="font-bold underline"
                        onClick={() => (limit === 0 ? remove.mutate(item.id) : update.mutate({ itemId: item.id, quantity: limit }))}
                      >
                        {limit === 0 ? 'Remover do carrinho' : `Ajustar para ${limit}`}
                      </button>
                    </span>
                  ) : notice?.kind === 'price' ? (
                    <span>
                      Preço atualizado{notice.previousPrice ? ` de ${formatEth(notice.previousPrice)}` : ''} para{' '}
                      {formatEth(item.unitPrice)}. O resumo foi recalculado.{' '}
                      <button type="button" className="font-bold underline" onClick={() => cartNotices.clear(item.id)}>
                        Entendi
                      </button>
                    </span>
                  ) : (
                    <span>A disponibilidade desta edição mudou.</span>
                  )}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ItemName({ item }: { item: CartItem }) {
  return (
    <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="block truncate leading-5 hover:text-text-accent">
      {item.nft.name}
    </Link>
  )
}

export function CartItemsSkeleton() {
  return (
    <div className="flex flex-col gap-5 md:gap-3" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="size-[100px] md:size-[70px]" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
