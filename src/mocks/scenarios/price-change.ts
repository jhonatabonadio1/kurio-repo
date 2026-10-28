import { eth } from '@/shared/money/eth'
import { onMockConfigChange } from '../config'
import { db } from '../db/store'
import { touchNft } from '../lib/nft'
import { publishNftUpdated } from '../realtime'

/**
 * "price-change" scenario: a few seconds after the first quote, the price
 * of the first item in that quote goes up 10%. The change is written to the
 * DB (REST sees it) and published as nft.updated (the socket sees it).
 */
export const PRICE_CHANGE_DELAY_MS = 4_000

let scheduled = false
onMockConfigChange(() => {
  scheduled = false
})

export function schedulePriceChange(nftId: string, editionId: string) {
  if (scheduled) return
  scheduled = true
  setTimeout(() => changeEditionPrice(nftId, editionId, (price) => eth.of(Number(eth.mul(price, 1.1)).toFixed(2))), PRICE_CHANGE_DELAY_MS)
}

export function changeEditionPrice(nftId: string, editionId: string, next: (price: string) => string) {
  const nft = db.write((s) => {
    const target = s.nfts.find((n) => n.id === nftId)
    const edition = target?.editions.find((e) => e.id === editionId)
    if (!target || !edition) return null
    target.previousPrice = null
    edition.price = next(edition.price) as typeof edition.price
    touchNft(target)
    return target
  })
  return nft ? publishNftUpdated(nft) : null
}

export function changeEditionStock(nftId: string, editionId: string, available: number) {
  const nft = db.write((s) => {
    const target = s.nfts.find((n) => n.id === nftId)
    const edition = target?.editions.find((e) => e.id === editionId)
    if (!target || !edition) return null
    edition.available = Math.max(0, available)
    touchNft(target)
    return target
  })
  return nft ? publishNftUpdated(nft) : null
}
