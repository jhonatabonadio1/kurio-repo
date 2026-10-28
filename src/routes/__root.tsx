import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'

import { SessionSync } from '@/features/auth/session-sync'
import { MobileTabBar } from '@/shared/layout/mobile-tab-bar'
import { SiteFooter } from '@/shared/layout/site-footer'
import { SiteHeader } from '@/shared/layout/site-header'
import { Button } from '@/shared/ui/button'
import { OutOfScopeProvider } from '@/shared/ui/out-of-scope'
import { Toaster } from '@/shared/ui/toaster'

export type RouterContext = { queryClient: QueryClient }

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <OutOfScopeProvider>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex min-h-dvh w-full max-w-[1248px] flex-col px-6 pt-6">
        <SiteHeader />
        <main id="conteudo" tabIndex={-1} className="flex-1 pt-4 md:pt-0 focus:outline-none">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <MobileTabBar />
      <SessionSync />
      <Toaster />
    </OutOfScopeProvider>
  )
}

function NotFound() {
  return (
    <section className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-3 text-sm text-text-secondary">O endereço que você abriu não existe ou foi movido.</p>
      <Button asChild className="mt-8">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
