import type { NftDetail } from '@/contracts/catalog'
import { eth } from '@/shared/money/eth'

/**
 * Recomputes the summary fields that depend on editions (card price =
 * cheapest edition with stock; soldOut) and bumps the version. Call after
 * any change to prices or stock.
 */
export function touchNft(nft: NftDetail) {
  const priced = nft.editions.filter((e) => e.available > 0)
  nft.price = eth.min(...(priced.length ? priced : nft.editions).map((e) => e.price))
  nft.soldOut = nft.editions.every((e) => e.available === 0)
  nft.version += 1
}
