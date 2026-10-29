import { Link, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'

import { useLogout } from '@/features/auth/use-logout'
import { useSession } from '@/features/auth/session'
import { cn } from '@/shared/lib/utils'
import { OutOfScopeLink } from '@/shared/ui/out-of-scope'
import { ACCOUNT_ITEMS } from './account-sidebar'

const SECTIONS = ACCOUNT_ITEMS.filter((item) => 'to' in item)
const OTHERS = ACCOUNT_ITEMS.filter((item) => 'outOfScope' in item)

/** Mobile/tablet top of the account pages: back + title, identity card, section tabs. */
export function AccountMobileHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const router = useRouter()
  const navigate = useNavigate()
  const user = useSession().user

  return (
    <div className="flex min-w-0 flex-col gap-6 lg:hidden">
      <div className="relative flex h-11 items-center justify-center md:hidden">
        <button
          type="button"
          onClick={() => (router.history.canGoBack() ? router.history.back() : void navigate({ to: '/' }))}
          className="absolute left-0 grid size-[35px] place-items-center rounded-full bg-surface-dark/60 text-text-accent"
          aria-label="Voltar"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <p className="text-lg font-bold">Meu perfil</p>
      </div>

      {user && (
        <div className="flex items-center gap-4 rounded-[20px] bg-card p-4">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" width={56} height={56} className="size-14 shrink-0 rounded-full object-cover" />
          ) : (
            <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-ink">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{user.displayName}</p>
            <p className="truncate text-sm text-text-secondary">@{user.username}</p>
          </div>
        </div>
      )}

      <nav aria-label="Seções da conta">
        <ul className="flex gap-6 overflow-x-auto shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none]">
          {SECTIONS.map((item) => {
            if (!('to' in item)) return null
            const active = pathname === item.to
            return (
              <li key={item.to} className="shrink-0">
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'block border-b-2 border-transparent pb-3 text-sm leading-4 font-bold whitespace-nowrap text-text-secondary transition-colors hover:text-foreground',
                    active && 'border-primary text-text-accent',
                  )}
                >
                  {item.label === 'Lista de interesse' ? 'Favoritos' : item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

const menuRow = 'flex h-[52px] w-full items-center gap-3 px-4 text-sm text-text-secondary transition-colors hover:text-foreground'

/** Rest of the "Meu perfil" menu on mobile/tablet, ending with "Sair". */
export function AccountMoreMenu() {
  const logout = useLogout()
  return (
    <nav aria-labelledby="account-more-title" className="lg:hidden">
      <h2 id="account-more-title" className="mb-3 text-base font-bold">
        Mais
      </h2>
      <ul className="divide-y divide-border-soft overflow-hidden rounded-[20px] bg-card">
        {OTHERS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.label}>
              <OutOfScopeLink feature={item.label} className={menuRow}>
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronRight className="size-4 shrink-0" aria-hidden />
              </OutOfScopeLink>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={cn(menuRow, 'font-bold text-text-accent hover:text-text-accent')}
          >
            <LogOut className="size-5 shrink-0" aria-hidden />
            Sair
          </button>
        </li>
      </ul>
    </nav>
  )
}
