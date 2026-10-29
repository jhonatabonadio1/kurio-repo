import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, User } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { OutOfScopeLink } from '@/shared/ui/out-of-scope'

// Circle cut out of the bar's top edge, 10px wider than the button on each side.
const NOTCH_MASK = 'radial-gradient(circle at 50% 0, transparent 43px, #000 44px)'
const NOTCH = { maskImage: NOTCH_MASK, WebkitMaskImage: NOTCH_MASK } as const

/** Mobile tab bar from the Figma: home, favorites, scan (centre), cart, profile. */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Detail and checkout have their own bottom buttons; auth screens are full pages (Figma).
  if (pathname.startsWith('/nfts/') || pathname === '/login' || pathname === '/register' || pathname === '/checkout' || pathname === '/cart') return null
  const item = 'grid size-11 place-items-center rounded-full text-text-secondary transition-colors'
  const current = 'text-text-accent'

  return (
    <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-40 h-[calc(76px+env(safe-area-inset-bottom))] md:hidden">
      {/* Figma: the bar has a round notch at the top centre where the scan
          button sits; the page shows through it. drop-shadow follows the cut. */}
      <div aria-hidden className="absolute inset-0 drop-shadow-[0_-8px_18px_rgba(10,6,4,0.45)]">
        <div className="h-full rounded-t-[28px] bg-card" style={NOTCH} />
      </div>
      <div className="relative mx-auto flex h-[76px] max-w-[414px] items-center justify-between px-6">
        <Link to="/" className={cn(item, pathname === '/' && current)} aria-label="Início" aria-current={pathname === '/' ? 'page' : undefined}>
          <House className="size-5" />
        </Link>
        <Link
          to="/favorites"
          className={cn(item, pathname === '/favorites' && current)}
          aria-label="Favoritos"
          aria-current={pathname === '/favorites' ? 'page' : undefined}
        >
          <Heart className="size-5" />
        </Link>
        <OutOfScopeLink
          feature="Escanear NFT"
          aria-label="Escanear NFT"
          className="grid size-[66px] -translate-y-8 place-items-center rounded-full bg-gradient-to-br from-primary/95 to-[#9c5f2c]/90 text-foreground shadow-[0_6px_16px_rgba(10,6,4,0.5)] backdrop-blur-sm"
        >
          <ScanLine className="size-6" />
        </OutOfScopeLink>
        <Link to="/cart" className={cn(item, pathname === '/cart' && current)} aria-label="Carrinho" aria-current={pathname === '/cart' ? 'page' : undefined}>
          <ShoppingCart className="size-5" />
        </Link>
        <Link
          to="/profile"
          className={cn(item, pathname.startsWith('/profile') && current)}
          aria-label="Minha conta"
          aria-current={pathname.startsWith('/profile') ? 'page' : undefined}
        >
          <User className="size-5" />
        </Link>
      </div>
    </nav>
  )
}
