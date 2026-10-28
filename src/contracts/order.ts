import { z } from 'zod'

import { ChainSchema } from './catalog'
import { EthAmountSchema } from './money'
import { QuoteLineSchema } from './quote'
import { WalletTypeSchema } from './wallet'

export const ORDER_STATUSES = ['pending', 'confirmed', 'rejected'] as const
export const OrderStatusSchema = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof OrderStatusSchema>
/** Confirmed and rejected never change again. */
export const isTerminalStatus = (status: OrderStatus) => status !== 'pending'

export const BuyerSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe seu nome completo.').max(80),
  email: z.email('Informe um e-mail válido.'),
})
export type Buyer = z.infer<typeof BuyerSchema>

/** Sent with the header `Idempotency-Key`. */
export const CreateOrderInputSchema = z.object({
  quoteId: z.string(),
  walletId: z.string(),
  network: ChainSchema,
  buyer: BuyerSchema,
})
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>

/** Frozen copy of the quote at order time; catalog changes never touch it. */
export const ReceiptSchema = z.object({
  lines: z.array(QuoteLineSchema),
  subtotal: EthAmountSchema,
  coupon: z.object({ code: z.string(), percentOff: z.number() }).nullable(),
  discount: EthAmountSchema,
  networkFee: EthAmountSchema,
  total: EthAmountSchema,
})
export type Receipt = z.infer<typeof ReceiptSchema>

export const OrderSchema = z.object({
  id: z.string(),
  status: OrderStatusSchema,
  version: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  network: ChainSchema,
  wallet: z.object({ id: z.string(), label: z.string(), type: WalletTypeSchema }),
  buyer: BuyerSchema,
  /** Simulated; set when confirmed. */
  txHash: z.string().nullable(),
  rejectReason: z.string().nullable(),
  receipt: ReceiptSchema,
})
export type Order = z.infer<typeof OrderSchema>

export const OrderListSchema = z.object({ orders: z.array(OrderSchema) })
