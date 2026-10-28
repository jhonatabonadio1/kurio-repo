import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, LogIn, LogOut, Search, ShoppingCart } from 'lucide-react'

import { useSession } from '@/features/auth/session'
import { useLogout } from '@/features/auth/use-logout'
import { useCart } from '@/features/cart/queries'

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
export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const href = useRouterState({ select: (s) => s.location.href })
  const { user } = useSession()
  const logout = useLogout()
  const cartCount = useCart().data?.itemCount ?? 0
  const isMarket = MARKET_PATHS.some((p) => pathname.startsWith(p))
  // Pages like /favorites or /login belong to neither item.
  const isHome = pathname === '/'
  const navItem = 'relative flex h-[45px] items-start text-base text-foreground transition-colors hover:text-text-accent'
  const active = 'font-bold text-text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-primary'

  return (
    <header className="hidden border-b border-border md:block">
      <div className="flex h-[45px] items-start justify-between">
        <Link to="/" className="w-[160px] pt-2 text-sm font-bold tracking-[0.1em]" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal" className="hidden gap-10 lg:flex">
          <Link to="/" className={cn(navItem, isHome && active)} aria-current={isHome ? 'page' : undefined}>
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
          {user && (
            <Link
              to="/favorites"
              className={cn('rounded-md p-1 transition-colors hover:text-text-accent', pathname === '/favorites' && 'text-text-accent')}
              aria-label="Meus favoritos"
              aria-current={pathname === '/favorites' ? 'page' : undefined}
            >
              <Heart className="size-6" />
            </Link>
          )}
          <Link
            to="/cart"
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
          {user ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm" title={user.email}>
                <span aria-hidden className="grid size-[35px] place-items-center rounded-full bg-surface-dark font-bold text-text-accent">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[120px] truncate">{user.displayName}</span>
              </span>
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-[35px] gap-1 text-sm font-medium')}
              >
                <LogOut className="size-4" aria-hidden />
                Sair
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              search={{ redirect: pathname === '/login' || pathname === '/register' ? undefined : href }}
              className={cn(buttonVariants({ size: 'sm' }), 'h-[35px] w-[100px] gap-1 text-base font-medium')}
            >
              <LogIn className="size-5" aria-hidden />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
