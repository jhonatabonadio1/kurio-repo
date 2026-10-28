import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

import { mergeGuestCart } from '@/features/cart/api'
import { checkoutDraft } from '@/features/checkout/draft'
import { rotateCartToken } from '@/shared/auth/cart-token'
import { sessionStore } from '@/shared/auth/session-store'
import { toast } from '@/shared/ui/toaster'

/**
 * Reacts to sign-in / sign-out:
 * - private data of the previous user (every ['me', ...] query, the session)
 *   is removed from the cache on logout, expiry and user switch;
 * - on expiry, the user goes to login and comes back to the same page.
 * - after login, the guest cart moves into the user's cart; after logout a
 *   new guest cart starts (the previous one belonged to the user).
 * (Socket teardown hooks in here when real time lands.)
 */
export function SessionSync() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(
    () =>
      sessionStore.subscribe((change) => {
        const switchedUser = change.type === 'signed-in' && change.previousUserId && change.previousUserId !== change.session.userId
        if (change.type === 'signed-out' || switchedUser) {
          queryClient.removeQueries({ queryKey: ['me'] })
          queryClient.removeQueries({ queryKey: ['session'] })
        }
        if (change.type === 'signed-in') {
          void mergeGuestCart()
            .then(({ cart, adjustments }) => {
              queryClient.setQueryData(['me', change.session.userId, 'cart'], cart)
              for (const a of adjustments) {
                toast(`${a.nftName}: mantivemos ${a.kept} de ${a.requested} no carrinho (limite de estoque).`, 'info')
              }
            })
            .catch(() => undefined)
            .finally(() => {
              queryClient.removeQueries({ queryKey: ['cart', 'guest'] })
              rotateCartToken()
            })
        }
        if (change.type === 'signed-out') {
          // Expiry keeps the checkout draft so the same user can resume; logout drops it.
          if (change.reason === 'logout') checkoutDraft.clear()
          queryClient.removeQueries({ queryKey: ['cart', 'guest'] })
          rotateCartToken()
        }
        if (change.type === 'signed-out' && change.reason === 'expired') {
          const { pathname, href } = router.state.location
          if (pathname !== '/login' && pathname !== '/register') {
            toast('Sua sessão expirou. Entre novamente para continuar.', 'error')
            void router.navigate({ to: '/login', search: { redirect: href, expired: true }, replace: true })
          }
        }
      }),
    [queryClient, router],
  )

  return null
}
