import { Link } from '@tanstack/react-router'
import * as React from 'react'

import type { NftSummary } from '@/contracts/catalog'
import { cn } from '@/shared/lib/utils'
import { formatEth } from '@/shared/money/eth'
import { NftArtwork } from '@/shared/ui/nft-artwork'
import { Skeleton } from '@/shared/ui/skeleton'

const PAGE_SIZE = 5

/**
 * Figma "Related Products" ("Mais desta coleção", "Colecionadores também
 * viram"): 5 cards per page under a ruled heading, with page dots below.
 * Below lg the row scrolls sideways and the dots follow the scroll.
 */
export function NftStrip({ title, items }: { title: string; items: NftSummary[] | undefined }) {
  const id = `strip-${title.replace(/\W+/g, '-').toLowerCase()}`
  const list = React.useRef<HTMLUListElement>(null)
  const [page, setPage] = React.useState(0)
  const pages = items ? Math.max(1, Math.ceil(items.length / PAGE_SIZE)) : 1

  const goTo = (next: number) => {
    setPage(next)
    const el = list.current
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const onScroll = () => {
    const el = list.current
    if (el && el.clientWidth) setPage(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <section aria-labelledby={id} className="flex flex-col gap-8">
      <h2 id={id} className="border-b border-border pb-3 text-base leading-4 font-bold text-text-accent">
        {title}
      </h2>
      <ul
        ref={list}
        onScroll={onScroll}
        className="-mx-6 flex snap-x snap-mandatory gap-[26px] overflow-x-auto scroll-px-6 px-6 pb-2 [scrollbar-width:none] lg:mx-0 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {items
          ? items.map((nft, i) => (
              <li
                key={nft.id}
                aria-hidden={pages > 1 && Math.floor(i / PAGE_SIZE) !== page ? true : undefined}
                className="relative flex w-[60vw] max-w-[219px] shrink-0 snap-start flex-col gap-3 lg:w-[calc((100%-4*26px)/5)] lg:max-w-none"
              >
                <div className="grid aspect-[219/255] place-items-center bg-card">
                  <NftArtwork image={nft.image} sizes="212px" className="w-[91%] rounded-[15px]" />
                </div>
                <Link
                  to="/nfts/$nftId"
                  params={{ nftId: nft.id }}
                  tabIndex={pages > 1 && Math.floor(i / PAGE_SIZE) !== page ? -1 : undefined}
                  className="text-[15px] leading-5 after:absolute after:inset-0 after:rounded-md"
                >
                  {nft.name}
                </Link>
                <p className="-mt-3 text-base leading-4 font-bold text-text-accent">{formatEth(nft.price)}</p>
              </li>
            ))
          : Array.from({ length: PAGE_SIZE }, (_, i) => (
              <li key={i} className="flex w-[60vw] max-w-[219px] shrink-0 flex-col gap-3 lg:w-[calc((100%-4*26px)/5)] lg:max-w-none" aria-hidden>
                <Skeleton className="aspect-[219/255] rounded-none" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </li>
            ))}
      </ul>
      {pages > 1 && (
        <div className="-mt-2 flex justify-center" role="group" aria-label={`${title}: páginas`}>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Página ${i + 1} de ${pages}`}
              aria-current={i === page ? 'true' : undefined}
              // 24px target (WCAG 2.5.8) around the 12px dot from the Figma.
              className="group grid size-6 place-items-center"
            >
              <span
                aria-hidden
                className={cn('size-3 rounded-full border-2 border-primary transition-colors', i === page ? 'bg-primary' : 'group-hover:bg-primary/40')}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
