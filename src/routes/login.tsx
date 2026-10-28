import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthScreen, AuthSearchSchema } from '@/features/auth/components/auth-screen'
import { safeRedirect } from '@/features/auth/session'
import { sessionStore } from '@/shared/auth/session-store'

export const Route = createFileRoute('/login')({
  validateSearch: AuthSearchSchema,
  // Already signed in: go straight to where the user was heading.
  beforeLoad: ({ search }) => {
    if (sessionStore.token()) throw redirect({ href: safeRedirect(search.redirect), replace: true })
  },
  component: function LoginPage() {
    return <AuthScreen mode="login" search={Route.useSearch()} />
  },
})
