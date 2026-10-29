import { Link } from '@tanstack/react-router'
import { Trash, TriangleAlert } from 'lucide-react'

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
// Figma "Cart Table" (782 wide): NFTs 312 · Preço 138 · Edições 135 · Total 157 · delete 40
const COLUMNS = 'md:grid-cols-[minmax(0,1fr)_138px_135px_157px_40px]'

/**
 * Cart lines. Desktop (Figma "Cart Table"): one card row per item. Mobile
 * (Figma "Cart Items"): 100px cards; at quantity 1 the minus button
 * removes the item, as the mobile frame has no trash column.
 */
export function CartItems({ items }: { items: CartItem[] }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const liveNotices = useCartNotices()
  const busy = (id: string) =>
    (update.isPending && update.variables?.itemId === id) || (remove.isPending && remove.variables === id)

  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden className={cn('hidden border-b border-border pb-3 text-lg leading-6 font-bold md:grid', COLUMNS)}>
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
          const notice = liveNotices.get(item.id) ?? item.notice
          const removeItem = () => remove.mutate(item.id)
          return (
            <li key={item.id} aria-busy={busy(item.id)} className={cn('flex flex-col transition-opacity', busy(item.id) && 'opacity-60')}>
              {/* Desktop row */}
              <div className={cn('hidden h-[70px] items-center rounded-md bg-card md:grid', COLUMNS)}>
                <div className="flex min-w-0 items-center gap-4">
                  <NftArtwork image={item.nft.image} sizes="70px" className="size-[70px] shrink-0 rounded-md" />
                  <div className="min-w-0">
                    <ItemName item={item} className="text-lg font-bold" />
                    <p className="truncate text-[15px] text-text-secondary">ID do token: {item.nft.tokenId}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-text-secondary">
                  <span className="sr-only">Preço unitário: </span>
                  {formatEth(item.unitPrice)}
                </p>
                <QuantityStepper
                  size="circle"
                  label={`Quantidade de ${item.nft.name}`}
                  value={item.quantity}
                  max={Math.max(limit, 1)}
                  disabled={busy(item.id)}
                  onChange={(quantity) => update.mutate({ itemId: item.id, quantity })}
                />
                <p className="text-lg font-bold text-text-accent">
                  <span className="sr-only">Total do item: </span>
                  {formatEth(item.lineTotal)}
                </p>
                <button
                  type="button"
                  onClick={removeItem}
                  disabled={busy(item.id)}
                  aria-label={`Remover ${item.nft.name} do carrinho`}
                  className="grid size-8 place-items-center rounded-md text-text-secondary transition-colors hover:text-destructive"
                >
                  <Trash className="size-6" strokeWidth={1.75} aria-hidden />
                </button>
              </div>

              {/* Mobile card */}
              <div className="flex h-[100px] items-stretch overflow-hidden rounded-[15px] bg-card md:hidden">
                <NftArtwork image={item.nft.image} sizes="100px" className="size-[100px] shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col justify-between py-2.5 pr-3 pl-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <ItemName item={item} className="text-sm font-bold" />
                      <p className="text-xs text-text-secondary">Edição: {EDITION_LABELS[item.edition.kind]}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-2.5">
                      {item.quantity <= 1 ? (
                        <button
                          type="button"
                          onClick={removeItem}
                          disabled={busy(item.id)}
                          aria-label={`Remover ${item.nft.name} do carrinho`}
                          className="grid size-6 place-items-center rounded-full bg-surface-dark/60 text-text-secondary hover:text-destructive"
                        >
                          <Trash className="size-3.5" aria-hidden />
                        </button>
                      ) : null}
                      <QuantityStepper
                        size="ghost"
                        label={`Quantidade de ${item.nft.name}`}
                        value={item.quantity}
                        max={Math.max(limit, 1)}
                        disabled={busy(item.id)}
                        className={item.quantity <= 1 ? '[&>button:first-child]:hidden' : undefined}
                        onChange={(quantity) => update.mutate({ itemId: item.id, quantity })}
                      />
                    </div>
                  </div>
                  <p className="text-base font-bold text-text-accent">
                    <span className="sr-only">Total do item: </span>
                    {formatEth(item.lineTotal)}
                  </p>
                </div>
              </div>

              {(overLimit || notice) && (
                <p role="status" className="flex items-start gap-2 px-1 pt-2 text-sm text-text-accent">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {overLimit ? (
                    <span>
                      {limit === 0 ? 'Esta edição esgotou. ' : `Só restam ${limit} disponíveis. `}
                      <button
                        type="button"
                        className="font-bold underline"
                        onClick={() => (limit === 0 ? removeItem() : update.mutate({ itemId: item.id, quantity: limit }))}
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

function ItemName({ item, className }: { item: CartItem; className?: string }) {
  return (
    <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className={cn('block truncate leading-6 hover:text-text-accent', className)}>
      {item.nft.name}
    </Link>
  )
}

export function CartItemsSkeleton() {
  return (
    <div className="flex flex-col gap-5 md:gap-3" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-[100px] w-full rounded-[15px] md:h-[70px] md:rounded-md" />
      ))}
    </div>
  )
}
