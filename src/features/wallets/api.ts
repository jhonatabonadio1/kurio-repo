import { WalletListSchema, WalletMutationResponseSchema, type WalletInput } from '@/contracts/wallet'
import { getParsed, sendParsed } from '@/shared/api/client'

const path = (id: string) => `/wallets/${encodeURIComponent(id)}`

export const fetchWallets = (signal?: AbortSignal) => getParsed('/wallets', WalletListSchema, { signal })

export const createWallet = (input: WalletInput) => sendParsed('post', '/wallets', input, WalletMutationResponseSchema)

export const updateWallet = (id: string, input: WalletInput) => sendParsed('put', path(id), input, WalletMutationResponseSchema)

export const makePrimaryWallet = (id: string) =>
  sendParsed('post', `${path(id)}/primary`, undefined, WalletMutationResponseSchema)

export const deleteWallet = (id: string) => sendParsed('delete', path(id), undefined, WalletMutationResponseSchema)
