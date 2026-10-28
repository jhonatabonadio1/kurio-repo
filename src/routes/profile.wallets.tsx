import { createFileRoute } from '@tanstack/react-router'

import { useSession } from '@/features/auth/session'
import { WalletManager } from '@/features/wallets/components/wallet-manager'
import { walletsQueryOptions } from '@/features/wallets/queries'
import { useDocumentTitle } from '@/shared/lib/use-document-title'

export const Route = createFileRoute('/profile/wallets')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(walletsQueryOptions(context.user.id))
  },
  component: WalletsPage,
})

function WalletsPage() {
  const context = Route.useRouteContext()
  const user = useSession().user ?? context.user
  useDocumentTitle('Minhas carteiras — Kurio')
  return <WalletManager user={user} />
}
