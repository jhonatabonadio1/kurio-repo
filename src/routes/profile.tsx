import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

import { requireAuth } from '@/features/auth/guards'
import { useSession } from '@/features/auth/session'
import { cn } from '@/shared/lib/utils'
import { UserAvatar } from '@/shared/ui/user-avatar'

export const Route = createFileRoute('/profile')({
  beforeLoad: requireAuth,
  component: AccountLayout,
})

const tab = 'relative flex h-11 items-center px-1 text-base text-text-secondary transition-colors hover:text-foreground'
const activeTab = 'font-bold text-text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-primary'

function AccountLayout() {
  const context = Route.useRouteContext()
  // Live user (updated by every profile save), the route context is a snapshot.
  const user = useSession().user ?? context.user

  return (
    <div className="flex flex-col gap-8 pb-10 md:pt-8">
      <header className="flex items-center gap-4">
        <UserAvatar user={user} size={56} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-2xl font-bold md:text-[32px] md:leading-10">Minha conta</h1>
          <p className="truncate text-sm text-text-secondary">
            {user.displayName} · @{user.username}
          </p>
        </div>
      </header>
      <nav aria-label="Seções da conta" className="flex gap-8 border-b border-border">
        <Link to="/profile" activeOptions={{ exact: true }} className={tab} activeProps={{ className: cn(activeTab), 'aria-current': 'page' }}>
          Perfil
        </Link>
        <Link to="/profile/wallets" className={tab} activeProps={{ className: cn(activeTab), 'aria-current': 'page' }}>
          Carteiras
        </Link>
      </nav>
      <Outlet />
    </div>
  )
}
