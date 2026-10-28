import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

import { sessionStore } from '@/shared/auth/session-store'
import { toast } from '@/shared/ui/toaster'

/**
 * Reacts to sign-in / sign-out:
 * - private data of the previous user (every ['me', ...] query, the session)
 *   is removed from the cache on logout, expiry and user switch;
 * - on expiry, the user goes to login and comes back to the same page.
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
