import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { sessionStore } from '@/shared/auth/session-store'
import { toast } from '@/shared/ui/toaster'
import { logout } from './api'

/**
 * Ends the session on the API, then locally even if the call fails
 * (the user asked to leave; a dead token is harmless). SessionSync
 * clears the private cache.
 */
export function useLogout() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => logout().catch(() => undefined),
    onSettled: () => {
      sessionStore.signOut('logout')
      toast('Você saiu da sua conta.', 'info')
      void navigate({ to: '/' })
    },
  })
}
