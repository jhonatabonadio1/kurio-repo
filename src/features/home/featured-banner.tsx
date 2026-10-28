import { Link } from '@tanstack/react-router'

import { ARTWORK_ALT } from '@/shared/ui/artwork-manifest'
import { NftArtwork } from '@/shared/ui/nft-artwork'

/** Sidebar "NFT EM DESTAQUE" (Figma "Featured NFT Banner"), links to the NFT. */
export function FeaturedBanner() {
  return (
    <aside aria-labelledby="featured-title" className="relative mt-6 bg-gradient-to-b from-primary/10 to-primary/[0.03] pt-6 pb-1">
      <Link to="/nfts/$nftId" params={{ nftId: 'sage-nomad-009' }} className="group flex flex-col gap-4">
        <div className="flex flex-col items-center gap-4">
          <h2 id="featured-title" className="w-full px-5 text-2xl leading-8 font-bold text-text-accent">
            NFT EM DESTAQUE
          </h2>
          <p className="text-[22px] leading-4 font-bold">OFERTA LIMITADA</p>
        </div>
        <NftArtwork
          image={{ key: 'sage-nomad', alt: ARTWORK_ALT['sage-nomad'] }}
          sizes="310px"
          className="aspect-[310/368] w-full rounded-[22px] transition-transform duration-300 group-hover:scale-[1.01] motion-reduce:transition-none"
        />
        <span className="sr-only">Sage Nomad #009 — ver detalhes</span>
      </Link>
    </aside>
  )
}
