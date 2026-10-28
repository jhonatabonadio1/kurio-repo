import { Link } from '@tanstack/react-router'

import type { NftSummary } from '@/contracts/catalog'
import { formatEth } from '@/shared/money/eth'
import { NftArtwork } from '@/shared/ui/nft-artwork'
import { Skeleton } from '@/shared/ui/skeleton'

export const CARD_IMAGE_SIZES = '(min-width: 1024px) 250px, (min-width: 768px) 30vw, 45vw'

/** Catalog card (Figma "Frame 141"): artwork on a card-coloured block, name, price. */
export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col gap-3">
      <div className="relative grid aspect-[258/300] place-items-center overflow-hidden bg-card">
        <NftArtwork
          image={nft.image}
          sizes={CARD_IMAGE_SIZES}
          priority={priority}
          className="w-[97%] rounded-[15px] transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
        />
        {nft.soldOut && (
          <span className="absolute top-3 left-3 rounded-md bg-ink/85 px-2 py-1 text-xs font-bold text-foreground">
            ESGOTADO
          </span>
        )}
      </div>
      <h3 className="text-sm leading-4 md:text-base">
        {/* The link covers the whole card (after:inset-0) but reads as the name. */}
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-ring"
        >
          {nft.name}
        </Link>
      </h3>
      <p className="flex flex-wrap items-baseline gap-x-3 text-base leading-4 font-bold text-text-accent md:text-lg">
        <span>
          <span className="sr-only">Preço: </span>
          {formatEth(nft.price)}
        </span>
        {nft.previousPrice && (
          <s className="text-sm font-normal text-text-secondary md:text-lg">
            <span className="sr-only">Preço anterior: </span>
            {formatEth(nft.previousPrice)}
          </s>
        )}
      </p>
    </article>
  )
}

/** Same footprint as NftCard, so nothing moves when data arrives. */
export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="aspect-[258/300] rounded-none" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}
