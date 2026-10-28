import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireAuth } from '@/features/auth/guards'
import { AccountSidebar } from '@/features/profile/components/account-sidebar'

export const Route = createFileRoute('/profile')({
  beforeLoad: requireAuth,
  component: AccountLayout,
})

/** Figma desktop account frames: 310px "Meu perfil" menu, 28px gap, content. */
function AccountLayout() {
  return (
    <div className="grid items-start gap-7 pb-16 md:pt-[33px] lg:grid-cols-[310px_minmax(0,1fr)]">
      <AccountSidebar />
      <Outlet />
    </div>
  )
}
