import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { collectionNftsQueryOptions } from '@/features/catalog/queries'
import { formatEth } from '@/shared/money/eth'
import { NftArtwork } from '@/shared/ui/nft-artwork'
import { Skeleton } from '@/shared/ui/skeleton'

/** "Mais desta coleção": up to 5 other NFTs of the same collection. */
export function RelatedNfts({ collection, excludeId }: { collection: string; excludeId: string }) {
  const query = useQuery(collectionNftsQueryOptions(collection))
  const items = query.data?.items.filter((n) => n.id !== excludeId).slice(0, 5)

  if (query.isError || (items && items.length === 0)) return null

  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-8">
      <h2 id="related-title" className="border-b border-border pb-3 text-base leading-4 font-bold text-text-accent">
        Mais desta coleção
      </h2>
      <ul className="-mx-6 flex snap-x snap-mandatory gap-[26px] overflow-x-auto px-6 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {items
          ? items.map((nft) => (
              <li key={nft.id} className="relative flex w-[60vw] max-w-[219px] shrink-0 snap-start flex-col gap-3 lg:w-auto">
                <div className="grid aspect-[219/255] place-items-center bg-card">
                  <NftArtwork image={nft.image} sizes="212px" className="w-[97%] rounded-[15px]" />
                </div>
                <Link
                  to="/nfts/$nftId"
                  params={{ nftId: nft.id }}
                  className="text-[15px] leading-5 after:absolute after:inset-0 after:rounded-md"
                >
                  {nft.name}
                </Link>
                <p className="-mt-3 text-base leading-4 font-bold text-text-accent">{formatEth(nft.price)}</p>
              </li>
            ))
          : Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex w-[60vw] max-w-[219px] shrink-0 flex-col gap-3 lg:w-auto" aria-hidden>
                <Skeleton className="aspect-[219/255] rounded-none" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </li>
            ))}
      </ul>
    </section>
  )
}
