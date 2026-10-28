import { z } from 'zod'

import { EDITION_KINDS, type Edition, type EditionKind, type NftDetail } from '@/contracts/catalog'
import { eth } from '@/shared/money/eth'

/** URL-safe edition names: 1/50 -> "1-50". */
export const editionSlug = (kind: EditionKind) => kind.replace('/', '-')
const SLUGS = EDITION_KINDS.map(editionSlug) as [string, ...string[]]

/** Detail page URL state: ?edicao=1-50&qtd=2 (shareable, survives refresh). */
export const NftDetailSearchSchema = z.object({
  edicao: z.enum(SLUGS).optional().catch(undefined),
  qtd: z.coerce.number().int().min(1).max(99).optional().catch(undefined),
})
export type NftDetailSearch = z.infer<typeof NftDetailSearchSchema>

/** How many of this edition one order may take right now. */
export const quantityLimit = (edition: Edition) => Math.min(edition.available, edition.maxPerOrder)

/** Edition from the URL, or the cheapest one with stock, or the first one. */
export function resolveEdition(nft: NftDetail, slug: string | undefined): Edition {
  const fromUrl = slug ? nft.editions.find((e) => editionSlug(e.kind) === slug) : undefined
  if (fromUrl) return fromUrl
  const available = nft.editions.filter((e) => e.available > 0)
  const cheapest = [...available].sort((a, b) => eth.cmp(a.price, b.price))[0]
  return cheapest ?? nft.editions[0]!
}
