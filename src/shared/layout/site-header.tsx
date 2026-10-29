import { Link, useRouterState } from '@tanstack/react-router'
import { LogOut, Search, ShoppingCart, UserRound } from 'lucide-react'

import { useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/queries'

import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/ui/button'
import { OutOfScopeLink } from '@/shared/ui/out-of-scope'
import { UserAvatar } from '@/shared/ui/user-avatar'
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

        {/* Figma: search (20) and cart (24) 50px apart, then the 100×35 button 36px after the cart. */}
        <div className="flex items-center gap-[26px]">
          <SearchDialog
            trigger={
              <button type="button" className="rounded-md p-1 transition-colors hover:text-text-accent" aria-label="Buscar NFTs">
                <Search className="size-[22px]" strokeWidth={2.25} />
              </button>
            }
          />
          <Link
            to="/cart"
            className="relative mr-2.5 rounded-md p-0.5 transition-colors hover:text-text-accent"
            aria-label={cartCount ? `Carrinho, ${cartCount} itens` : 'Carrinho'}
          >
            <ShoppingCart className="size-6" strokeWidth={1.75} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] leading-none font-bold text-foreground">
                {cartCount}
              </span>
            )}
          </Link>
          {user ? (
            // Same slot and style as the Figma "Entrar" button; "Sair" lives in the "Meu perfil" menu.
            <Link
              to="/profile"
              className={cn(buttonVariants({ size: 'sm' }), 'h-[35px] max-w-[180px] min-w-[100px] gap-1.5 text-base font-medium')}
              title={user.email}
              aria-label={`Minha conta (${user.displayName})`}
            >
              {user.avatarUrl ? <UserAvatar user={user} size={22} /> : <UserRound className="size-5 shrink-0" aria-hidden />}
              <span className="truncate">{user.displayName.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              search={{ redirect: pathname === '/login' || pathname === '/register' ? undefined : href }}
              className={cn(buttonVariants({ size: 'sm' }), 'h-[35px] w-[100px] gap-1 text-base font-medium')}
            >
              {/* Figma's "Entrar" icon: open box on the left, arrow pointing right. */}
              <LogOut className="size-5" aria-hidden />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
