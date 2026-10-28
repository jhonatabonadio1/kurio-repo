import { z } from 'zod'

import { CHAINS } from './catalog'

export const WALLET_TYPES = ['metamask', 'walletconnect', 'coinbase'] as const
export const WalletTypeSchema = z.enum(WALLET_TYPES)
export type WalletType = z.infer<typeof WalletTypeSchema>
export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const WalletSlotSchema = z.enum(['primary', 'secondary'])
export type WalletSlot = z.infer<typeof WalletSlotSchema>

const required = (label: string) => z.string().trim().min(1, `Informe ${label}.`)

/** Fields of the "Carteiras" frame (same set for primary and secondary). */
export const WalletInputSchema = z.object({
  displayName: required('o nome de exibição').max(40),
  alias: required('o apelido da carteira').max(30),
  network: z.enum(CHAINS, { error: 'Selecione uma rede.' }),
  profileName: required('o nome do perfil').max(40),
  address: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Use um endereço 0x com 40 caracteres hexadecimais.'),
  secondaryAddress: z
    .string()
    .trim()
    .regex(/^(0x[a-fA-F0-9]{40}|[a-z0-9-]{3,32}\.eth)$/, 'Use um endereço 0x ou um nome .eth.')
    .or(z.literal(''))
    .optional(),
  walletType: z.enum(WALLET_TYPES, { error: 'Selecione o tipo de carteira.' }),
  // Required in the Figma "Carteiras" frame.
  referralCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{4,12}$/, 'Use 4 a 12 letras maiúsculas ou números.'),
  email: z.email('Informe um e-mail válido.'),
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,32}$/, 'Use 3 a 32 caracteres: letras minúsculas, números ou "-".'),
})
export type WalletInput = z.infer<typeof WalletInputSchema>

export const WalletSchema = WalletInputSchema.extend({
  id: z.string(),
  slot: WalletSlotSchema,
  secondaryAddress: z.string().nullable(),
  /** Wallets saved before the code became required (Figma) may have none. */
  referralCode: z.string().nullable(),
  version: z.number().int().nonnegative(),
})
export type Wallet = z.infer<typeof WalletSchema>

export const WalletListSchema = z.object({ wallets: z.array(WalletSchema) })
export type WalletList = z.infer<typeof WalletListSchema>

/** A user keeps at most a primary and a secondary wallet (Figma "Carteiras"). */
export const WALLET_LIMIT = 2

/**
 * Every wallet write answers with the whole list: making one wallet primary
 * or deleting the primary also changes the other one.
 */
export const WalletMutationResponseSchema = WalletListSchema.extend({ wallet: WalletSchema.nullable() })
export type WalletMutationResponse = z.infer<typeof WalletMutationResponseSchema>
