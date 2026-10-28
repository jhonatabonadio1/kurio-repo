import * as React from 'react'

import type { NftImage } from '@/contracts/catalog'
import { cn } from '@/shared/lib/utils'
import { NftArtwork } from '@/shared/ui/nft-artwork'

/**
 * Desktop gallery (Figma "Product Images"): 4 thumbnails on the left
 * (100×100, 16 apart) and the main image (444, artwork inset 20).
 */
export function NftGallery({ images, favoriteSlot }: { images: NftImage[]; favoriteSlot?: React.ReactNode }) {
  const [index, setIndex] = React.useState(0)
  const current = images[index] ?? images[0]!

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row md:gap-7">
      <ul aria-label="Imagens do NFT" className="flex shrink-0 gap-3 md:flex-col md:gap-4">
        {images.map((image, i) => (
          <li key={`${image.key}-${i}`}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              aria-label={`Ver imagem ${i + 1} de ${images.length}`}
              className={cn(
                'block size-16 overflow-hidden rounded-md border-2 transition-colors md:size-[100px]',
                i === index ? 'border-primary' : 'border-transparent hover:border-border-soft',
              )}
            >
              <NftArtwork image={{ ...image, alt: '' }} sizes="100px" className="size-full" />
            </button>
          </li>
        ))}
      </ul>
      <div className="relative grid aspect-square w-full place-items-center bg-card max-md:rounded-2xl md:max-w-[444px]">
        <NftArtwork image={current} sizes="(min-width: 768px) 404px, 90vw" priority className="w-[91%] rounded-[15px]" />
        {favoriteSlot && <div className="absolute top-3.5 right-3.5">{favoriteSlot}</div>}
      </div>
    </div>
  )
}
