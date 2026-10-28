import { z } from 'zod'

import { ChainSchema, EditionKindSchema, ImageSchema } from './catalog'
import { EthAmountSchema } from './money'

/** The coupon comes from the cart; the network is chosen at checkout. */
export const QuoteRequestSchema = z.object({
  network: ChainSchema,
})
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>

export const QuoteLineSchema = z.object({
  cartItemId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  editionKind: EditionKindSchema,
  image: ImageSchema,
  quantity: z.number().int().min(1),
  unitPrice: EthAmountSchema,
  lineTotal: EthAmountSchema,
})
export type QuoteLine = z.infer<typeof QuoteLineSchema>

/** What changed since the previous quote; the UI asks for a new confirmation. */
export const QuoteChangeSchema = z.object({
  kind: z.enum(['price', 'availability', 'removed', 'coupon']),
  nftName: z.string().nullable(),
  from: z.string().nullable(),
  to: z.string().nullable(),
})
export type QuoteChange = z.infer<typeof QuoteChangeSchema>

export const QuoteSchema = z.object({
  id: z.string(),
  cartVersion: z.number().int(),
  network: ChainSchema,
  lines: z.array(QuoteLineSchema),
  subtotal: EthAmountSchema,
  coupon: z.object({ code: z.string(), percentOff: z.number() }).nullable(),
  discount: EthAmountSchema,
  networkFee: EthAmountSchema,
  total: EthAmountSchema,
  expiresAt: z.iso.datetime(),
  changes: z.array(QuoteChangeSchema),
})
export type Quote = z.infer<typeof QuoteSchema>

/** Estimated network fee per chain (mock values; Ethereum matches the Figma). */
export const NETWORK_FEES = { ethereum: '0.016', polygon: '0.002', solana: '0.001' } as const
