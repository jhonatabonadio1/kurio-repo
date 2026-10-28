import './index.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { queryClient } from '@/app/query-client'
import { parseSearch, stringifySearch } from '@/app/search-params'
import { env } from '@/env'
import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Data is managed by TanStack Query; the router should always ask it.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  parseSearch,
  stringifySearch,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// The worker must be running before the first request and before
// socket.io-client loads (see src/shared/realtime/socket.ts).
async function enableMocking() {
  if (!env.apiMocking) return
  const { startMockWorker } = await import('./mocks/browser')
  await startMockWorker()
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
})
