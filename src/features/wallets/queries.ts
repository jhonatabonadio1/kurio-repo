import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

import type { WalletInput, WalletList, WalletMutationResponse } from '@/contracts/wallet'
import { createWallet, deleteWallet, fetchWallets, makePrimaryWallet, updateWallet } from './api'

/** Private data: under ['me', userId], dropped on logout or user switch. */
export const walletsKey = (userId: string) => ['me', userId, 'wallets'] as const

export const walletsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: walletsKey(userId),
    queryFn: ({ signal }) => fetchWallets(signal),
    staleTime: 5 * 60_000,
  })

export type WalletAction =
  | { type: 'create'; input: WalletInput }
  | { type: 'update'; id: string; input: WalletInput }
  | { type: 'primary'; id: string }
  | { type: 'delete'; id: string }

const run = (action: WalletAction) => {
  switch (action.type) {
    case 'create':
      return createWallet(action.input)
    case 'update':
      return updateWallet(action.id, action.input)
    case 'primary':
      return makePrimaryWallet(action.id)
    case 'delete':
      return deleteWallet(action.id)
  }
}

/**
 * Every wallet write answers with the full list, so the cache is replaced
 * from the server response (no guess about which slot changed).
 */
export function useWalletMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation<WalletMutationResponse, Error, WalletAction>({
    mutationFn: run,
    onSuccess: ({ wallets }) => queryClient.setQueryData<WalletList>(walletsKey(userId), { wallets }),
  })
}
