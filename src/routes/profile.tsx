import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireAuth } from '@/features/auth/guards'
import { AccountMobileHeader, AccountMoreMenu } from '@/features/profile/components/account-mobile-nav'
import { AccountSidebar } from '@/features/profile/components/account-sidebar'

export const Route = createFileRoute('/profile')({
  beforeLoad: requireAuth,
  component: AccountLayout,
})

/**
 * Desktop (Figma account frames): 310px "Meu perfil" menu, 28px gap, content.
 * Below lg there is no frame, so the page follows the mobile app frames:
 * back button + title, identity card, underlined section tabs, and the rest
 * of the menu (with "Sair") in a card after the content.
 */
function AccountLayout() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-7 pb-28 md:pt-[33px] md:pb-16 lg:grid-cols-[310px_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <AccountSidebar />
      </div>
      <AccountMobileHeader />
      <div className="min-w-0">
        <Outlet />
      </div>
      <AccountMoreMenu />
    </div>
  )
}
