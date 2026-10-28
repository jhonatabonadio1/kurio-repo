import { createFileRoute } from '@tanstack/react-router'

import { useSession } from '@/features/auth/session'
import { ProfileForm } from '@/features/profile/components/profile-form'
import { useDocumentTitle } from '@/shared/lib/use-document-title'

export const Route = createFileRoute('/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  const context = Route.useRouteContext()
  // Live user (updated by every save); the route context is a snapshot.
  const user = useSession().user ?? context.user
  useDocumentTitle('Perfil do colecionador — Kurio')
  // Keyed by user: another account never sees this form's values.
  return <ProfileForm key={user.id} user={user} />
}
