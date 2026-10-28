import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/contracts/api-error'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry only transient failures (network, timeout, 5xx); never 4xx.
      retry: (failureCount, error) =>
        failureCount < MAX_RETRIES && error instanceof ApiError && error.retryable,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
    },
    mutations: {
      // Mutations never auto-retry; the order flow retries itself with its idempotency key.
      retry: false,
    },
  },
})
