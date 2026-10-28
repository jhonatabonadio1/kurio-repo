/**
 * Downloads the NFT artwork from the Figma file and writes responsive WebP
 * files to public/nft/<key>-<width>.webp. Run once, then commit the files:
 *
 *   pnpm assets:figma
 *
 * The Figma asset URLs below are temporary (they expire ~7 days after
 * 2026-10-28). After that, export the four images from the Figma file
 * (layers "NFT Artwork 03/04/05/09") and pass a local folder instead:
 *
 *   pnpm assets:figma ./my-exports   (files named <key>.png)
 */
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { ARTWORK_KEYS, ARTWORK_WIDTHS, type ArtworkKey } from '../src/shared/ui/artwork-manifest.ts'

const FIGMA_URLS: Record<ArtworkKey, string> = {
  // Green varsity jacket, sunglasses (hero, "Emerald Ape #042")
  'emerald-ape': 'https://www.figma.com/api/mcp/asset/ca298d75-b0b5-4fad-bb87-f0703839ad52/8f387.png',
  // Bucket hat, purple hoodie ("Sage Nomad #009", featured banner)
  'sage-nomad': 'https://www.figma.com/api/mcp/asset/019909da-b4fe-4616-b7af-c1feaab86f7f/83794.png',
  // Cream blazer, green turtleneck ("Neon Vessel #552")
  'neon-vessel': 'https://www.figma.com/api/mcp/asset/04147655-0a05-49f1-8689-ffbee0cec2b6/9add2.png',
  // Headphones, golden fur ("Golden Beat #207")
  'golden-beat': 'https://www.figma.com/api/mcp/asset/b311a6bc-8020-464c-80fe-3cb8d91deeea/b7cfc.png',
}

const OUT_DIR = path.resolve(import.meta.dirname, '../public/nft')
const localDir = process.argv[2]

async function source(key: ArtworkKey): Promise<Buffer> {
  if (localDir) return readFile(path.resolve(localDir, `${key}.png`))
  const res = await fetch(FIGMA_URLS[key])
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status} (URL expired? see header comment)`)
  return Buffer.from(await res.arrayBuffer())
}

await mkdir(OUT_DIR, { recursive: true })
for (const key of ARTWORK_KEYS) {
  const input = await source(key)
  for (const width of ARTWORK_WIDTHS) {
    const file = path.join(OUT_DIR, `${key}-${width}.webp`)
    await sharp(input).resize({ width, height: width, fit: 'cover' }).webp({ quality: 78 }).toFile(file)
  }
  console.log(`✓ ${key} (${ARTWORK_WIDTHS.join(', ')} px)`)
}
console.log(`\nSaved to ${path.relative(process.cwd(), OUT_DIR)}. Commit these files.`)
