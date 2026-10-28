import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { buttonVariants } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { NftArtwork } from '@/shared/ui/nft-artwork'
import { ARTWORK_ALT } from '@/shared/ui/artwork-manifest'

/** Static decoration: the Figma shows three dots, but there is a single slide. */
function Dots({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('flex gap-1.5', className)}>
      <span className="size-[7px] rounded-full bg-primary" />
      <span className="size-[7px] rounded-full bg-primary/60" />
      <span className="size-[7px] rounded-full bg-primary/60" />
    </span>
  )
}

/** Desktop/tablet hero (Figma "Hero", 1200×450). The artwork is the LCP element. */
export function HeroDesktop() {
  return (
    <section aria-labelledby="hero-title" className="hidden items-center justify-between gap-10 pt-8 md:flex lg:pl-10">
      <div className="flex max-w-[600px] flex-col items-end gap-11">
        <div className="flex w-full flex-col gap-8">
          <div className="flex flex-col gap-1">
            <p className="text-sm leading-4 font-medium tracking-[0.1em]">Bem-vindo à Kurio</p>
            <h1 id="hero-title" className="mt-2 text-3xl leading-[1.6] font-bold lg:text-display">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </h1>
            <p className="max-w-[557px] text-sm leading-6 text-text-secondary">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie
              artistas e tenha uma parte da cultura da internet.
            </p>
          </div>
          <Link to="/" hash="catalogo" className={cn(buttonVariants(), 'w-[140px] leading-5')}>
            EXPLORAR
          </Link>
        </div>
        <Dots />
      </div>
      <NftArtwork
        image={{ key: 'emerald-ape', alt: ARTWORK_ALT['emerald-ape'] }}
        sizes="(min-width: 1024px) 450px, 40vw"
        priority
        className="w-[40%] max-w-[450px] shrink-0 rounded-[24px]"
      />
    </section>
  )
}

/** Mobile banner (Figma "Hero Banner", 366×190). */
export function HeroMobile() {
  return (
    <section
      aria-labelledby="hero-mobile-title"
      className="relative overflow-hidden rounded-xl bg-surface-dark p-4 md:hidden"
      style={{
        backgroundImage:
          'radial-gradient(circle at 10% 60%, rgba(210,138,76,0.28) 0, transparent 45%), radial-gradient(circle at 55% 40%, rgba(210,138,76,0.18) 0, transparent 50%)',
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-xs leading-4 font-medium">Bem-vindo à Kurio</p>
          <h1 id="hero-mobile-title" className="text-lg leading-[29px] font-bold">
            SEJA DONO DA CULTURA DIGITAL
          </h1>
          <p className="text-xs leading-[18px] text-text-secondary">Descubra NFTs selecionados de criadores do mundo todo.</p>
          <Link to="/" hash="catalogo" className="mt-1 flex items-center gap-2 py-1 text-xs leading-[14px] font-bold text-text-accent">
            EXPLORAR <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="relative shrink-0 pb-2">
          <NftArtwork
            image={{ key: 'emerald-ape', alt: ARTWORK_ALT['emerald-ape'] }}
            sizes="138px"
            priority
            className="size-[138px] rounded-2xl"
          />
          <NftArtwork
            image={{ key: 'sage-nomad', alt: '' }}
            sizes="58px"
            className="absolute bottom-0 left-3.5 size-[58px] rounded-2xl ring-2 ring-surface-dark"
          />
        </div>
      </div>
      <Dots className="mt-3 justify-center" />
    </section>
  )
}
