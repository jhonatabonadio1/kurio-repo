import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'

import { Button } from '@/shared/ui/button'

export type RouterContext = { queryClient: QueryClient }

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1200px] flex-col px-4 py-6 md:px-6 xl:px-0">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <Link to="/" className="text-sm font-bold tracking-[0.1em] text-text-primary">
          KURIO
        </Link>
      </header>
      <main id="conteudo" className="flex-1 py-8">
        <Outlet />
      </main>
    </div>
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
