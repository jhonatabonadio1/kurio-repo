import { z } from 'zod'

import { EditionKindSchema, ImageSchema } from './catalog'
import { EthAmountSchema, QuantitySchema } from './money'

export const CartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  quantity: QuantitySchema,
  /** Current catalog price. */
  unitPrice: EthAmountSchema,
  lineTotal: EthAmountSchema,
  nft: z.object({ name: z.string(), tokenId: z.string(), image: ImageSchema }),
  edition: z.object({
    kind: EditionKindSchema,
    available: z.number().int().nonnegative(),
    maxPerOrder: z.number().int().positive(),
  }),
  /**
   * Set when price or stock changed after the item was added and the user
   * has not acknowledged it yet (cleared by viewing the cart).
   */
  notice: z
    .object({
      kind: z.enum(['price', 'availability']),
      previousPrice: EthAmountSchema.nullable(),
      previousQuantity: z.number().int().nullable(),
    })
    .nullable(),
})
export type CartItem = z.infer<typeof CartItemSchema>

export const CartSchema = z.object({
  items: z.array(CartItemSchema),
  itemCount: z.number().int().nonnegative(),
  subtotal: EthAmountSchema,
  /** Coupon applied to this cart (validated again by every quote). */
  couponCode: z.string().nullable(),
  /** Increases on every change; quotes are tied to one cart version. */
  version: z.number().int().nonnegative(),
})
export type Cart = z.infer<typeof CartSchema>

export const AddCartItemInputSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: QuantitySchema,
})
export type AddCartItemInput = z.infer<typeof AddCartItemInputSchema>

export const UpdateCartItemInputSchema = z.object({ quantity: QuantitySchema })
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemInputSchema>

/** POST /cart/merge (on login): items the guest cart could not keep in full. */
export const CartMergeResponseSchema = z.object({
  cart: CartSchema,
  adjustments: z.array(
    z.object({
      nftName: z.string(),
      requested: z.number().int(),
      kept: z.number().int(),
    }),
  ),
})
export type CartMergeResponse = z.infer<typeof CartMergeResponseSchema>

export const ApplyCouponInputSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'Digite um código promocional.').max(20),
})
export type ApplyCouponInput = z.infer<typeof ApplyCouponInputSchema>
