import { z } from 'zod'

/**
 * ETH amounts travel as decimal strings ("1.19", "0.016") and are never
 * converted to `number`. Math happens in src/shared/money with decimal.js.
 */
export const EthAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')
  .brand<'EthAmount'>()
export type EthAmount = z.infer<typeof EthAmountSchema>

/** Quantities are whole numbers. */
export const QuantitySchema = z.number().int().min(1)
