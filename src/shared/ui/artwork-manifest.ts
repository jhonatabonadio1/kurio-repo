/**
 * Artwork files in public/nft, produced by `pnpm assets:figma` from the
 * Figma file. All artworks are square. Kept free of Vite-only APIs so the
 * Node asset script can import it.
 */
export const ARTWORK_KEYS = ['emerald-ape', 'sage-nomad', 'neon-vessel', 'golden-beat'] as const
export type ArtworkKey = (typeof ARTWORK_KEYS)[number]

export const ARTWORK_WIDTHS = [320, 640, 960] as const
export type ArtworkWidth = (typeof ARTWORK_WIDTHS)[number]
