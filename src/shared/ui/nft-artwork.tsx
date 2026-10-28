import type * as React from 'react'

import type { NftImage } from '@/contracts/catalog'
import { cn } from '@/shared/lib/utils'
import { ARTWORK_WIDTHS, type ArtworkWidth } from './artwork-manifest'

export const artworkUrl = (key: string, width: ArtworkWidth) =>
  `${import.meta.env.BASE_URL}nft/${key}-${width}.webp`

const srcSet = (key: string) => ARTWORK_WIDTHS.map((w) => `${artworkUrl(key, w)} ${w}w`).join(', ')

type Props = Omit<React.ComponentProps<'img'>, 'src' | 'srcSet' | 'alt'> & {
  image: NftImage
  /** CSS width the image renders at, for the browser to pick a file. */
  sizes: string
  /** LCP image: load eagerly with high priority. */
  priority?: boolean
}

/**
 * Square NFT artwork with responsive WebP sources. Width/height are set so
 * the browser reserves the space before the file loads (no layout shift).
 */
export function NftArtwork({ image, sizes, priority = false, className, ...props }: Props) {
  return (
    <img
      src={artworkUrl(image.key, 640)}
      srcSet={srcSet(image.key)}
      sizes={sizes}
      alt={image.alt}
      width={640}
      height={640}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn('aspect-square bg-surface-card object-cover', className)}
      {...props}
    />
  )
}
