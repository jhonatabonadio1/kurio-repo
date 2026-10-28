import { Link, useRouterState } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'
import { OutOfScopeLink } from '@/shared/ui/out-of-scope'
import { SearchDialog } from './search-dialog'

const MARKET_PATHS = ['/nfts', '/cart', '/checkout', '/orders']

/**
 * Desktop/tablet header from the Figma "Header Row": wordmark, nav with one
 * active item, search, cart with badge, sign-in. Hidden below md, where the
 * mobile tab bar takes over.
 */
export function SiteHeader({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isMarket = MARKET_PATHS.some((p) => pathname.startsWith(p))
  const navItem = 'relative flex h-[45px] items-start text-base text-foreground transition-colors hover:text-text-accent'
  const active = 'font-bold text-text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-primary'

  return (
    <header className="hidden border-b border-border md:block">
      <div className="flex h-[45px] items-start justify-between">
        <Link to="/" className="w-[160px] pt-2 text-sm font-bold tracking-[0.1em]" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal" className="hidden gap-10 lg:flex">
          <Link to="/" className={cn(navItem, !isMarket && active)} aria-current={!isMarket ? 'page' : undefined}>
            Início
          </Link>
          <Link to="/" hash="catalogo" className={cn(navItem, isMarket && active)} aria-current={isMarket ? 'page' : undefined}>
            Mercado
          </Link>
          <OutOfScopeLink feature="Criadores" className={navItem}>
            Criadores
          </OutOfScopeLink>
          <OutOfScopeLink feature="Aprenda" className={navItem}>
            Aprenda
          </OutOfScopeLink>
        </nav>

        <div className="flex items-center gap-7">
          <SearchDialog
            trigger={
              <button type="button" className="rounded-md p-1 transition-colors hover:text-text-accent" aria-label="Buscar NFTs">
                <Search className="size-5" />
              </button>
            }
          />
          <Link
            to="/"
            hash="carrinho"
            className="relative rounded-md p-1 transition-colors hover:text-text-accent"
            aria-label={cartCount ? `Carrinho, ${cartCount} itens` : 'Carrinho'}
          >
            <ShoppingCart className="size-6" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-1 grid size-4 place-items-center rounded-full bg-primary text-tiny font-medium text-ink">
                {cartCount}
              </span>
            )}
          </Link>
          <Link to="/" hash="entrar" className={cn(buttonVariants({ size: 'sm' }), 'h-[35px] w-[100px] gap-1 text-base font-medium')}>
            <LogIn className="size-5" />
            Entrar
          </Link>
        </div>
      </div>
    </header>
  )
}
