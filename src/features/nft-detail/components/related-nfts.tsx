import { useQuery } from '@tanstack/react-query'

import { NftStrip } from '@/features/catalog/components/nft-strip'
import { collectionNftsQueryOptions } from '@/features/catalog/queries'

/** "Mais desta coleção": up to 5 other NFTs of the same collection. */
export function RelatedNfts({ collection, excludeId }: { collection: string; excludeId: string }) {
  const query = useQuery(collectionNftsQueryOptions(collection))
  const items = query.data?.items.filter((n) => n.id !== excludeId).slice(0, 5)
  if (query.isError || (items && items.length === 0)) return null
  return <NftStrip title="Mais desta coleção" items={items} />
}
