import { queryOptions, useQuery } from '@tanstack/react-query'

import { ApiError } from '@/contracts/api-error'
import type { SessionInfo } from '@/contracts/account'
import { sessionStore, useSessionToken } from '@/shared/auth/session-store'
import { fetchSession } from './api'

/**
 * The signed-in user. Keyed by token, so a new login never reads the
 * previous user's entry. null = signed out.
 */
export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: ['session', sessionStore.token()] as const,
    queryFn: async ({ signal }): Promise<SessionInfo | null> => {
      if (!sessionStore.token()) return null
      try {
        return await fetchSession(signal)
      } catch (error) {
        // 401 already signed the store out (interceptor); report "signed out".
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    staleTime: 5 * 60_000,
    retry: (count, error) => count < 2 && error instanceof ApiError && error.retryable,
  })

export function useSession() {
  useSessionToken()
  const query = useQuery(sessionQueryOptions())
  return {
    user: query.data?.user ?? null,
    isSignedIn: Boolean(query.data?.user),
    isPending: query.isPending,
  }
}

/** Only internal paths, never the auth pages themselves (no open redirects). */
export function safeRedirect(target: unknown): string {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) return '/'
  if (/^\/(login|register)(\?|$)/.test(target)) return '/'
  return target
}
