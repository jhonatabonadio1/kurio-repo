/**
 * Artwork files in public/nft, produced by `pnpm assets:figma` from the
 * Figma file. All artworks are square. Kept free of Vite-only APIs so the
 * Node asset script can import it.
 */
export const ARTWORK_KEYS = ['emerald-ape', 'sage-nomad', 'neon-vessel', 'golden-beat'] as const
export type ArtworkKey = (typeof ARTWORK_KEYS)[number]

export const ARTWORK_WIDTHS = [320, 640, 960] as const
export type ArtworkWidth = (typeof ARTWORK_WIDTHS)[number]

/** Text alternatives for each artwork file (used by fixtures and static sections). */
export const ARTWORK_ALT: Record<ArtworkKey, string> = {
  'emerald-ape': 'Macaco ilustrado com óculos redondos e jaqueta college verde',
  'sage-nomad': 'Macaco ilustrado com chapéu bucket verde e moletom roxo',
  'neon-vessel': 'Macaco ilustrado de pelo escuro com blazer creme e gola alta verde',
  'golden-beat': 'Macaco ilustrado de pelo dourado com fones de ouvido verdes',
}
