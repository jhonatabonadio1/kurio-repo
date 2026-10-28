import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { PasswordChangeSchema, ProfileUpdateSchema, type ProfileUpdate, type User } from '@/contracts/account'
import { ApiError } from '@/contracts/api-error'
import { applyApiError, FormError } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { EnsField } from '@/shared/ui/ens-field'
import { TextField } from '@/shared/ui/text-field'
import { toast } from '@/shared/ui/toaster'
import { useChangePassword, useRefreshSessionUser, useUpdateProfile } from '../mutations'
import { AvatarEditor } from './avatar-editor'

/** One form, one "Salvar" (Figma): password fields are validated only when one of them is filled. */
const ProfilePageSchema = ProfileUpdateSchema.extend({
  currentPassword: z.string(),
  newPassword: z.string(),
  confirmPassword: z.string(),
}).superRefine((v, ctx) => {
  if (!v.currentPassword && !v.newPassword && !v.confirmPassword) return
  const result = PasswordChangeSchema.safeParse(v)
  if (result.success) return
  for (const issue of result.error.issues) ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path })
})
type Values = z.infer<typeof ProfilePageSchema>

const PROFILE_FIELDS = ['displayName', 'username', 'email', 'ensName', 'walletAlias'] as const
const NO_PASSWORD = { currentPassword: '', newPassword: '', confirmPassword: '' }

const toValues = (user: User): Values => ({
  displayName: user.displayName,
  username: user.username,
  email: user.email,
  ensName: user.ensName ?? '',
  walletAlias: user.walletAlias ?? '',
  ...NO_PASSWORD,
})

/**
 * "Perfil do colecionador". The profile is saved with If-Match = the version
 * it was loaded from: a change made elsewhere answers 409 and the user can
 * load the current data instead of overwriting it.
 */
export function ProfileForm({ user }: { user: User }) {
  const [baseVersion, setBaseVersion] = React.useState(user.version)
  const form = useForm<Values>({ resolver: zodResolver(ProfilePageSchema), defaultValues: toValues(user) })
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const refresh = useRefreshSessionUser()
  const [formError, setFormError] = React.useState<string | null>(null)
  const [conflict, setConflict] = React.useState(false)
  const busy = updateProfile.isPending || changePassword.isPending
  const { errors } = form.formState
  const field = 'gap-3.5'

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    const dirty = form.formState.dirtyFields
    const profileChanged = PROFILE_FIELDS.some((key) => dirty[key])
    const passwordFilled = Boolean(values.currentPassword || values.newPassword)
    if (!profileChanged && !passwordFilled) {
      toast('Nenhuma alteração para salvar.', 'info')
      return
    }
    const done: string[] = []
    let profile: ProfileUpdate = values

    if (profileChanged) {
      try {
        const { user: saved } = await updateProfile.mutateAsync({ input: values, version: baseVersion })
        setBaseVersion(saved.version)
        profile = toValues(saved)
        done.push('Perfil atualizado')
      } catch (error) {
        if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
          setConflict(true)
          setFormError(error.message)
        } else setFormError(applyApiError(form, error))
        return
      }
    }
    if (passwordFilled) {
      try {
        const { revokedSessions } = await changePassword.mutateAsync(values)
        done.push(revokedSessions > 0 ? `senha alterada (${revokedSessions === 1 ? '1 outra sessão encerrada' : `${revokedSessions} outras sessões encerradas`})` : 'senha alterada')
      } catch (error) {
        form.reset({ ...values, ...profile }, { keepErrors: true })
        setFormError(applyApiError(form, error))
        if (done.length) toast(`${done.join(', ')}.`, 'success')
        return
      }
    }
    form.reset({ ...profile, ...NO_PASSWORD })
    const message = done.join(', ')
    toast(`${message.charAt(0).toUpperCase()}${message.slice(1)}.`, 'success')
  })

  const loadCurrent = async () => {
    const fresh = await refresh().catch(() => null)
    if (!fresh) return setFormError('Não foi possível carregar os dados atuais. Tente novamente.')
    form.reset(toValues(fresh))
    setBaseVersion(fresh.version)
    setConflict(false)
    setFormError(null)
    toast('Dados atuais carregados. Refaça suas alterações, se ainda quiser.', 'info')
  }

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col" aria-busy={busy} aria-labelledby="profile-title">
      <h1 id="profile-title" className="text-lg leading-6 font-bold">
        Perfil do colecionador
      </h1>
      {formError && (
        <div className="mt-5 flex flex-col items-start gap-3">
          <FormError message={formError} />
          {conflict && (
            <Button type="button" size="sm" variant="outline" onClick={() => void loadCurrent()}>
              Carregar dados atuais
            </Button>
          )}
        </div>
      )}
      <div className="mt-8 grid gap-x-[29px] gap-y-[30px] sm:grid-cols-2">
        <TextField variant="outline" className={field} requiredMark label="Nome de exibição" autoComplete="name" error={errors.displayName?.message} {...form.register('displayName')} />
        <TextField variant="outline" className={field} requiredMark label="Nome de usuário" autoComplete="username" error={errors.username?.message} {...form.register('username')} />
        <TextField variant="outline" className={field} requiredMark label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
        <EnsField variant="outline" className={field} requiredMark error={errors.ensName?.message} {...form.register('ensName')} />
        <TextField variant="outline" className={field} requiredMark label="Apelido da carteira" autoComplete="off" error={errors.walletAlias?.message} {...form.register('walletAlias')} />
        <AvatarEditor user={user} />
      </div>

      <h2 className="mt-[29px] text-lg leading-6 font-bold">Alterar senha</h2>
      <div className="mt-[18px] grid gap-y-[23px] sm:grid-cols-2 sm:gap-x-[29px]">
        <div className="flex flex-col gap-[23px]">
          <TextField variant="outline" className="gap-2.5" label="Senha atual" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register('currentPassword')} />
          <TextField
            variant="outline"
            className="gap-2.5"
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...form.register('newPassword')}
          />
          <TextField variant="outline" className="gap-2.5" label="Confirmar nova senha" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register('confirmPassword')} />
        </div>
      </div>

      <Button type="submit" className="mt-[33px] w-[131px] self-start" disabled={busy || conflict}>
        {busy && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
        Salvar
      </Button>
    </form>
  )
}
