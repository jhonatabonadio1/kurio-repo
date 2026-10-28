import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import type { CatalogTab } from '@/contracts/catalog'
import type { ArtworkKey } from '@/shared/ui/artwork-manifest'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'
import { NftArtwork } from '@/shared/ui/nft-artwork'

const PROMOS: { art: ArtworkKey; title: [string, string]; text: string; tab: CatalogTab }[] = [
  {
    art: 'emerald-ape',
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    tab: 'new',
  },
  {
    art: 'neon-vessel',
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    tab: 'trending',
  },
]

/** Two promo cards (Figma "Promos"); "Explorar" opens the matching catalog tab. */
export function PromoCards() {
  return (
    <section aria-label="Destaques" className="grid gap-6 md:grid-cols-2 lg:gap-7">
      {PROMOS.map((promo) => (
        <article key={promo.art} className="relative flex min-h-[250px] overflow-hidden rounded-lg bg-card">
          <NftArtwork image={{ key: promo.art, alt: '' }} sizes="(min-width: 768px) 292px, 45vw" className="w-1/2 max-w-[292px] shrink-0 rounded-[18px]" />
          <div className="flex flex-1 flex-col items-end justify-center gap-3 p-4 text-right sm:p-[30px]">
            <h2 className="text-base leading-6 font-bold sm:text-lg">
              {promo.title[0]}
              <br />
              {promo.title[1]}
            </h2>
            <p className="max-w-[263px] text-xs leading-5 text-text-secondary sm:text-sm sm:leading-6">{promo.text}</p>
            <Link
              to="/"
              search={{ tab: promo.tab }}
              hash="catalogo"
              className={cn(buttonVariants(), 'mt-2 w-[140px] text-sm font-medium')}
              aria-label={`Explorar ${promo.title.join(' ').toLowerCase()}`}
            >
              Explorar <ArrowRight className="size-[18px]" aria-hidden />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}
