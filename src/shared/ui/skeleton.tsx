import type * as React from 'react'

import { cn } from '@/shared/lib/utils'

// shadcn/ui Skeleton with the Kurio shimmer (see `skeleton` utility in index.css).
// Give it the same size as the content it replaces, so nothing shifts on load.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn('skeleton', className)} {...props} />
}

export { Skeleton }
