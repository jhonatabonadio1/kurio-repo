import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type * as React from 'react'

import { Button } from './button'

/**
 * "Tentar novamente" for route error components. `reset()` alone only clears
 * the error boundary; the loader must run again (router.invalidate) and the
 * failed query must be allowed to refetch.
 */
export function RetryButton({ reset, ...props }: { reset: () => void } & React.ComponentProps<typeof Button>) {
  const router = useRouter()
  const queryReset = useQueryErrorResetBoundary()
  return (
    <Button
      {...props}
      onClick={() => {
        queryReset.reset()
        reset()
        void router.invalidate()
      }}
    >
      Tentar novamente
    </Button>
  )
}
