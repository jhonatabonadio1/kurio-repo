import { createFileRoute } from '@tanstack/react-router'

import { useSession } from '@/features/auth/session'
import { AccountSection } from '@/features/profile/components/account-section'
import { AvatarEditor } from '@/features/profile/components/avatar-editor'
import { PasswordForm } from '@/features/profile/components/password-form'
import { ProfileForm } from '@/features/profile/components/profile-form'
import { useDocumentTitle } from '@/shared/lib/use-document-title'

export const Route = createFileRoute('/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  const context = Route.useRouteContext()
  const user = useSession().user ?? context.user
  useDocumentTitle('Meu perfil — Kurio')

  return (
    <div className="flex flex-col gap-6">
      <AccountSection id="avatar-title" title="Foto do perfil">
        <AvatarEditor user={user} />
      </AccountSection>
      <AccountSection id="profile-title" title="Dados do perfil" description="Aparecem no seu perfil público e nos recibos.">
        {/* Keyed by user: another account never sees this form's values. */}
        <ProfileForm key={user.id} user={user} />
      </AccountSection>
      <AccountSection id="password-title" title="Alterar senha" description="Ao trocar a senha, as outras sessões abertas são encerradas.">
        <PasswordForm />
      </AccountSection>
    </div>
  )
}
