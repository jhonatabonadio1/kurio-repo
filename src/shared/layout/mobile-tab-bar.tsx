import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, User } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { OutOfScopeLink } from '@/shared/ui/out-of-scope'

/** Mobile tab bar from the Figma: home, favorites, scan (centre), cart, profile. */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const item = 'grid size-11 place-items-center rounded-full text-text-secondary transition-colors'
  const current = 'text-text-accent'

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 h-[76px] rounded-t-[28px] bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(10,6,4,0.45)] md:hidden"
    >
      <div className="mx-auto flex h-full max-w-[414px] items-center justify-between px-6">
        <Link to="/" className={cn(item, pathname === '/' && current)} aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined}>
          <House className="size-5" />
        </Link>
        <Link to="/" hash="favoritos" className={item} aria-label="Favoritos">
          <Heart className="size-5" />
        </Link>
        <OutOfScopeLink
          feature="Escanear NFT"
          aria-label="Escanear NFT"
          className="-mt-10 grid size-[65px] place-items-center rounded-full border-[6px] border-background bg-gradient-to-b from-primary to-[#9c5f2c] text-foreground"
        >
          <ScanLine className="size-6" />
        </OutOfScopeLink>
        <Link to="/" hash="carrinho" className={item} aria-label="Carrinho">
          <ShoppingCart className="size-5" />
        </Link>
        <Link to="/" hash="perfil" className={item} aria-label="Perfil">
          <User className="size-5" />
        </Link>
      </div>
    </nav>
  )
}
