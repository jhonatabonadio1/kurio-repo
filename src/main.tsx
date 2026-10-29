import './index.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { queryClient } from '@/app/query-client'
import { parseSearch, stringifySearch } from '@/app/search-params'
import { env } from '@/env'
import { markMocksFailed, markMocksReady } from '@/shared/api/mocks-ready'
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
// socket.io-client loads: both wait for `mocksReady` (src/shared/api/mocks-ready.ts),
// so the page itself can render while the worker starts.
async function enableMocking() {
  if (!env.apiMocking) return
  const { startMockWorker } = await import('./mocks/browser')
  await startMockWorker()
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

enableMocking().then(
  () => {
    // Visible for E2E tests and debugging: <html data-mocks="ready">.
    if (env.apiMocking) document.documentElement.dataset.mocks = 'ready'
    markMocksReady()
  },
  (error: unknown) => {
    // Without the worker every request would fail; say why instead of a blank page.
    console.error(error)
    markMocksFailed(error)
    root.render(<MockStartupError />)
  },
)

function MockStartupError() {
  return (
    <main role="alert" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-6">
      <p className="text-sm font-bold tracking-[0.1em]">KURIO</p>
      <h1 className="text-2xl font-bold">Não foi possível iniciar a API simulada</h1>
      <p className="text-sm leading-6 text-text-secondary">
        Esta demonstração usa um Service Worker (MSW) para simular a API. Seu navegador bloqueou o registro dele,
        por exemplo em uma janela privada com cookies bloqueados ou em um navegador embutido. Abra o site em uma
        janela normal do Chrome, Edge, Firefox ou Safari.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 h-10 w-fit rounded-md bg-primary px-6 text-sm font-bold text-ink"
      >
        Tentar novamente
      </button>
    </main>
  )
}
