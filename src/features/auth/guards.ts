import type { QueryClient } from '@tanstack/react-query'
import { redirect, type ParsedLocation } from '@tanstack/react-router'

import { sessionStore } from '@/shared/auth/session-store'
import { sessionQueryOptions } from './session'

/**
 * beforeLoad for private routes: no valid session -> /login?redirect=<here>.
 * The session is validated with the API (expired tokens are caught here,
 * not on the first private request).
 */
export async function requireAuth({ context, location }: { context: { queryClient: QueryClient }; location: ParsedLocation }) {
  // An expired session (also one that expires during this check) keeps the
  // "session expired" notice; the route guard and the session listener can race.
  const toLogin = () =>
    redirect({
      to: '/login',
      search: { redirect: location.href, ...(sessionStore.lastSignOut() === 'expired' && { expired: true }) },
      replace: true,
    })
  if (!sessionStore.token()) throw toLogin()
  const session = await context.queryClient.ensureQueryData(sessionQueryOptions())
  if (!session) throw toLogin()
  return { user: session.user }
}

/** Pages behind requireAuth (checkout, profile/*, favorites, orders/*). */
const PRIVATE_PATHS = ['/checkout', '/profile', '/favorites', '/orders']

export function isPrivatePath(href: string): boolean {
  const path = href.split(/[?#]/)[0] ?? ''
  return PRIVATE_PATHS.some((p) => path === p || path.startsWith(`${p}/`))
}
