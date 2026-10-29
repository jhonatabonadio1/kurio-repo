import { Link, useRouterState } from '@tanstack/react-router'
import { ChartSpline, Download, Heart, LogOut, MapPin, ShoppingCart, TriangleAlert, User, type LucideIcon } from 'lucide-react'

import { useLogout } from '@/features/auth/use-logout'
import { cn } from '@/shared/lib/utils'
import { OutOfScopeLink } from '@/shared/ui/out-of-scope'

export type Item =
  | { label: string; icon: LucideIcon; to: '/profile' | '/profile/wallets' | '/favorites' }
  | { label: string; icon: LucideIcon; outOfScope: true }

/** "Meu perfil" menu from the Figma (Desktop / Perfil do Colecionador and Carteiras). */
export const ACCOUNT_ITEMS: Item[] = [
  { label: 'Dados do perfil', icon: User, to: '/profile' },
  { label: 'Carteiras', icon: MapPin, to: '/profile/wallets' },
  { label: 'Atividade', icon: ShoppingCart, outOfScope: true },
  { label: 'Lista de interesse', icon: Heart, to: '/favorites' },
  { label: 'Ofertas', icon: ChartSpline, outOfScope: true },
  { label: 'Arquivos baixados', icon: Download, outOfScope: true },
  { label: 'Suporte', icon: TriangleAlert, outOfScope: true },
]

const row = 'relative flex h-[45px] shrink-0 items-center gap-[11px] whitespace-nowrap pr-4 pl-[17px] text-base text-text-secondary transition-colors hover:text-foreground'
const activeRow = 'before:absolute before:inset-y-0 before:left-0 before:w-[5px] before:bg-primary pl-[19px]'

export function AccountSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const logout = useLogout()

  return (
    <nav aria-labelledby="account-menu-title" className="flex min-w-0 flex-col bg-card">
      <h2 id="account-menu-title" className="px-2.5 pt-4 pb-1.5 text-lg leading-6 font-bold max-lg:sr-only">
        Meu perfil
      </h2>
      <ul className="flex overflow-x-auto max-lg:[scrollbar-width:none] lg:flex-col">
        {ACCOUNT_ITEMS.map((item) => {
          const Icon = item.icon
          const content = (
            <>
              <Icon className="size-5 shrink-0" aria-hidden />
              {item.label}
            </>
          )
          if ('outOfScope' in item) {
            return (
              <li key={item.label}>
                <OutOfScopeLink feature={item.label} className={row}>
                  {content}
                </OutOfScopeLink>
              </li>
            )
          }
          const active = pathname === item.to
          return (
            <li key={item.label}>
              <Link to={item.to} className={cn(row, active && activeRow)} aria-current={active ? 'page' : undefined}>
                {content}
              </Link>
            </li>
          )
        })}
        <li className="lg:border-t lg:border-border-soft">
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={cn(row, 'w-full font-bold text-text-accent hover:text-text-accent lg:h-12')}
          >
            <LogOut className="size-5 shrink-0" aria-hidden />
            Sair
          </button>
        </li>
      </ul>
    </nav>
  )
}
