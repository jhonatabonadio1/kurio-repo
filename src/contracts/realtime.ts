import { z } from 'zod'

import { EthAmountSchema } from './money'
import { OrderStatusSchema } from './order'

/**
 * Every Socket.IO event uses this envelope.
 * - eventId: stable id, used to drop duplicates
 * - resource + version: drop events older than what the cache holds
 */
const envelope = <TType extends string, TData extends z.ZodType>(
  type: TType,
  resourceType: 'nft' | 'order',
  data: TData,
) =>
  z.object({
    eventId: z.string(),
    type: z.literal(type),
    resource: z.object({ type: z.literal(resourceType), id: z.string() }),
    version: z.number().int().nonnegative(),
    occurredAt: z.iso.datetime(),
    data,
  })

export const NftUpdatedEventSchema = envelope(
  'nft.updated',
  'nft',
  z.object({
    price: EthAmountSchema,
    previousPrice: EthAmountSchema.nullable(),
    soldOut: z.boolean(),
    editions: z.array(
      z.object({
        editionId: z.string(),
        price: EthAmountSchema,
        available: z.number().int().nonnegative(),
      }),
    ),
  }),
)
export type NftUpdatedEvent = z.infer<typeof NftUpdatedEventSchema>

export const OrderUpdatedEventSchema = envelope(
  'order.updated',
  'order',
  z.object({
    /** Owner of the order; the client drops events for any other user. */
    userId: z.string(),
    status: OrderStatusSchema,
    txHash: z.string().nullable(),
    rejectReason: z.string().nullable(),
  }),
)
export type OrderUpdatedEvent = z.infer<typeof OrderUpdatedEventSchema>

export const REALTIME_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const
