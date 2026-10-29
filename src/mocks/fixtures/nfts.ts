import {
  CATEGORIES,
  CHAIN_LABELS,
  type Category,
  type Chain,
  type Edition,
  type EditionKind,
  type NftDetail,
  type NftImage,
} from '@/contracts/catalog'
import type { EthAmount } from '@/contracts/money'
import { eth } from '@/shared/money/eth'
import { ARTWORK_ALT, type ArtworkKey } from '@/shared/ui/artwork-manifest'
import { createRandom, type Random } from '../lib/random'
import { slugify } from '../lib/text'
import { cheapestInStock } from '../lib/nft'

/** Fixed clock for fixtures, so "new" and dates never drift between runs. */
export const FIXTURE_NOW = Date.parse('2026-10-20T12:00:00.000Z')
const DAY = 86_400_000

const ARTWORKS = Object.keys(ARTWORK_ALT) as ArtworkKey[]
const COLLECTION_BY_ART: Record<ArtworkKey, string> = {
  'emerald-ape': 'Kurio Apes',
  'sage-nomad': 'Nomad Club',
  'neon-vessel': 'Vessel Society',
  'golden-beat': 'Beat Lab',
}
const image = (key: ArtworkKey): NftImage => ({ key, alt: ARTWORK_ALT[key] })

type Seed = {
  name: string
  /** Defaults to the collection of the artwork. */
  collection?: string
  number: string
  price: string
  previousPrice?: string
  art: ArtworkKey
  category: Category
  chain: Chain
  kinds?: EditionKind[]
  soldOut?: boolean
  trending?: boolean
  attributes?: string[]
}

/** The nine cards of the Figma home grid, in order (row 3 col 2 has no label there). */
const FIGMA_GRID: Seed[] = [
  { name: 'Emerald Ape', number: '042', price: '1.19', art: 'emerald-ape', category: 'arte-digital', chain: 'ethereum', trending: true, attributes: ['Óculos', 'Esmeralda', 'Raro'] },
  { name: 'Sage Nomad', number: '009', price: '1.69', art: 'sage-nomad', category: 'colecionaveis', chain: 'ethereum' },
  { name: 'Neon Vessel', number: '552', price: '1.99', previousPrice: '2.29', art: 'neon-vessel', category: 'arte-3d', chain: 'polygon', trending: true },
  { name: 'Cosmic Bloom', number: '118', price: '1.29', art: 'sage-nomad', category: 'generativa', chain: 'ethereum' },
  { name: 'Violet Nomad', number: '314', price: '1.39', art: 'sage-nomad', category: 'arte-digital', chain: 'solana' },
  { name: 'Ivory Baron', number: '088', price: '1.79', art: 'neon-vessel', category: 'fotografia', chain: 'ethereum', trending: true },
  { name: 'Golden Beat', number: '207', price: '0.99', art: 'golden-beat', category: 'musica', chain: 'polygon' },
  { name: 'Amber Pilot', number: '077', price: '0.69', art: 'golden-beat', category: 'jogos', chain: 'solana' },
  { name: 'Golden Signal', number: '160', price: '0.39', art: 'golden-beat', category: 'musica', chain: 'ethereum' },
]

const ADJECTIVES = ['Rustic', 'Onyx', 'Copper', 'Velvet', 'Midnight', 'Crimson', 'Jade', 'Solar', 'Lunar', 'Silent', 'Wild', 'Royal', 'Dusty', 'Electric', 'Hidden', 'Silver', 'Ember', 'Mossy']
const NOUNS = ['Monk', 'Drifter', 'Oracle', 'Ronin', 'Pilot', 'Bard', 'Scout', 'Keeper', 'Rider', 'Sage', 'Echo', 'Atlas', 'Mystic', 'Rebel', 'Voyager']
const ATTRIBUTES = ['Óculos', 'Esmeralda', 'Raro', 'Chapéu', 'Fones', 'Dourado', 'Moletom', 'Blazer', 'Lendário', 'Comum', 'Brinco', 'Corrente', 'Neon', 'Vintage']
const CREATORS = ['Nova Sato', 'Leo Prado', 'Iris Kim', 'Davi Rocha', 'Mara Lins']
const EXTRA_COUNT = 51

/** Relative edition prices; the cheapest edition with stock is the card price. */
const EDITION_FACTOR: Record<EditionKind, number> = { aberta: 1, '1/50': 1.5, '1/10': 3, '1/1': 8 }
const ALL_KINDS: EditionKind[] = ['1/1', '1/10', '1/50', 'aberta']

function editionsFor(id: string, cardPrice: string, kinds: EditionKind[], soldOut: boolean, rnd: Random): Edition[] {
  const base = Math.min(...kinds.map((k) => EDITION_FACTOR[k]))
  return kinds.map((kind) => {
    // Fixture prices are rounded to 2 decimals; the cheapest edition keeps the card price.
    const price =
      EDITION_FACTOR[kind] === base
        ? (cardPrice as EthAmount)
        : eth.of(Number(eth.mul(cardPrice, EDITION_FACTOR[kind] / base)).toFixed(2))
    const supply = kind === 'aberta' ? null : Number(kind.split('/')[1])
    const available = soldOut
      ? 0
      : kind === '1/1'
        ? rnd.chance(0.7) ? 1 : 0
        : kind === 'aberta'
          ? 9_999
          : rnd.int(kind === '1/10' ? 0 : 4, supply ?? 0)
    return {
      id: `${id}--${slugify(kind)}`,
      kind,
      price,
      supply,
      available,
      maxPerOrder: kind === '1/1' ? 1 : kind === '1/10' ? 5 : 10,
    }
  })
}

function buildNft(seed: Seed, index: number, rnd: Random): NftDetail {
  const id = `${slugify(seed.name)}-${seed.number}`
  const kinds = seed.kinds ?? ALL_KINDS
  const soldOut = seed.soldOut ?? false
  const editions = editionsFor(id, seed.price, kinds, soldOut, rnd)
  const priced = editions.filter((e) => e.available > 0)
  const price = eth.min(...(priced.length ? priced : editions).map((e) => e.price))
  const listedAt = index < FIGMA_GRID.length ? FIXTURE_NOW - index * 3_600_000 : FIXTURE_NOW - rnd.int(1, 60) * DAY
  const attributes = seed.attributes ?? rnd.shuffle(ATTRIBUTES).slice(0, 3)
  const creator = rnd.pick(CREATORS)
  const chainName = CHAIN_LABELS[seed.chain]
  const collection = seed.collection ?? COLLECTION_BY_ART[seed.art]
  const editionText = kinds.includes('1/50') ? '1/50' : (kinds[0] ?? '1/1')

  return {
    id,
    name: `${seed.name} #${seed.number}`,
    tokenId: `#${seed.number.padStart(4, '0')}`,
    collection,
    category: seed.category,
    chain: seed.chain,
    image: image(seed.art),
    price,
    previousPrice: seed.previousPrice && eth.cmp(seed.previousPrice, price) > 0 ? (seed.previousPrice as EthAmount) : null,
    soldOut: editions.every((e) => e.available === 0),
    defaultEditionId: cheapestInStock(editions),
    isNew: FIXTURE_NOW - listedAt <= 10 * DAY,
    trending: seed.trending ?? false,
    listedAt: new Date(listedAt).toISOString(),
    version: 1,
    about: `Um colecionável digital finalizado à mão da coleção ${collection}, verificado na ${chainName}, com arte desbloqueável e acesso para colecionadores.`,
    description: `${seed.name} #${seed.number} é uma obra digital ${editionText} finalizada à mão da coleção ${collection}. Cada atributo fica armazenado nos metadados do token e verificado na ${chainName}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras. A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência na rede. ${creator} recebe 5% de direitos autorais nas vendas secundárias.`,
    attributes,
    creator: { name: creator, royaltyPercent: 5 },
    contract: `0x${rnd.hex(4)}...${rnd.hex(4)}`,
    // Figma: the four thumbnails show the same artwork.
    gallery: Array.from({ length: 4 }, () => image(seed.art)),
    editions,
    rating: index === 0 ? { average: 4.8, count: 19 } : { average: rnd.int(42, 50) / 10, count: rnd.int(3, 40) },
  }
}

/** 60 NFTs: the Figma grid first, then 51 generated from a fixed seed. */
export function createNftFixtures(): NftDetail[] {
  const rnd = createRandom(20261028)
  const usedNames = new Set(FIGMA_GRID.map((s) => s.name))
  const categories = rnd.shuffle([...CATEGORIES, ...CATEGORIES, ...CATEGORIES, ...CATEGORIES, ...CATEGORIES, ...CATEGORIES])
  const extras: Seed[] = []

  for (let i = 0; extras.length < EXTRA_COUNT; i++) {
    const name = `${rnd.pick(ADJECTIVES)} ${rnd.pick(NOUNS)}`
    if (usedNames.has(name)) continue
    usedNames.add(name)
    const n = extras.length
    // Log-uniform prices between 0.02 and 12.30, with both edges present.
    const price = n === 0 ? '0.02' : n === 1 ? '12.30' : (0.02 * Math.pow(12.3 / 0.02, rnd.next())).toFixed(2)
    const kinds = rnd.shuffle(ALL_KINDS).slice(0, rnd.int(2, 4))
    extras.push({
      name,
      number: String(rnd.int(1, 999)).padStart(3, '0'),
      price: eth.of(price === '0.00' ? '0.02' : price),
      previousPrice: rnd.chance(0.12) ? eth.of((Number(price) * 1.2).toFixed(2)) : undefined,
      art: rnd.pick(ARTWORKS),
      // Independent of the artwork, so "Mais desta coleção" shows varied art.
      collection: rnd.pick(Object.values(COLLECTION_BY_ART)),
      category: categories[n % categories.length] as Category,
      chain: rnd.next() < 0.5 ? 'ethereum' : rnd.next() < 0.5 ? 'polygon' : 'solana',
      kinds: ALL_KINDS.filter((k) => kinds.includes(k)),
      soldOut: n % 12 === 5,
      trending: rnd.chance(0.3),
    })
  }

  return [...FIGMA_GRID, ...extras].map((seed, index) => buildNft(seed, index, rnd))
}
