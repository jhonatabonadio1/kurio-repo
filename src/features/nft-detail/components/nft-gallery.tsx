import { Search } from 'lucide-react'
import * as React from 'react'

import type { NftImage } from '@/contracts/catalog'
import { cn } from '@/shared/lib/utils'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { NftArtwork } from '@/shared/ui/nft-artwork'

/**
 * Figma "Product Images". Desktop: 4 thumbnails on the left (100×100, 16
 * apart) and the main image (444, artwork inset 20) with a zoom button in
 * the corner. Mobile: only the artwork, as a rounded card.
 */
export function NftGallery({ images, name }: { images: NftImage[]; name: string }) {
  const [index, setIndex] = React.useState(0)
  const [zoomed, setZoomed] = React.useState(false)
  const current = images[index] ?? images[0]!

  return (
    <div className="flex gap-7">
      <ul aria-label="Imagens do NFT" className="hidden shrink-0 flex-col gap-4 md:flex">
        {images.map((image, i) => (
          <li key={`${image.key}-${i}`}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              aria-label={`Ver imagem ${i + 1} de ${images.length}`}
              className={cn(
                'block size-[100px] overflow-hidden rounded-lg border-2 transition-colors',
                i === index ? 'border-primary' : 'border-transparent hover:border-border-soft',
              )}
            >
              <NftArtwork image={{ ...image, alt: '' }} sizes="100px" className="size-full" />
            </button>
          </li>
        ))}
      </ul>
      <div className="relative w-full md:grid md:aspect-square md:max-w-[444px] md:place-items-center md:bg-card">
        <NftArtwork image={current} sizes="(min-width: 768px) 404px, 90vw" priority className="w-full rounded-[20px] md:w-[91%] md:rounded-[15px]" />
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label={`Ampliar imagem de ${name}`}
          className="absolute top-[13px] right-[13px] hidden size-[30px] place-items-center rounded-full bg-ink text-foreground transition-colors hover:text-text-accent md:grid"
        >
          <Search className="size-[18px]" strokeWidth={2.25} aria-hidden />
        </button>
      </div>

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="max-w-[min(90vw,820px)] border-b-0 bg-transparent p-0 shadow-none sm:p-0" closeClassName="-top-10 right-0 text-foreground">
          <DialogTitle className="sr-only">{name} ampliado</DialogTitle>
          <NftArtwork image={current} sizes="820px" className="w-full rounded-[20px]" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
