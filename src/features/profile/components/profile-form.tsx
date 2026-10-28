import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'

import { ProfileUpdateSchema, type ProfileUpdate, type User } from '@/contracts/account'
import { ApiError } from '@/contracts/api-error'
import { applyApiError, FormError } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { TextField } from '@/shared/ui/text-field'
import { toast } from '@/shared/ui/toaster'
import { useRefreshSessionUser, useUpdateProfile } from '../mutations'

const toValues = (user: User): ProfileUpdate => ({
  displayName: user.displayName,
  username: user.username,
  email: user.email,
  ensName: user.ensName ?? '',
  walletAlias: user.walletAlias ?? '',
})

/**
 * Profile data. The form remembers the version it was filled from and sends
 * it as If-Match: if the profile changed elsewhere, the API answers 409 and
 * the user chooses to load the current data instead of overwriting it.
 */
export function ProfileForm({ user }: { user: User }) {
  const [baseVersion, setBaseVersion] = React.useState(user.version)
  const form = useForm<ProfileUpdate>({ resolver: zodResolver(ProfileUpdateSchema), defaultValues: toValues(user) })
  const mutation = useUpdateProfile()
  const refresh = useRefreshSessionUser()
  const [formError, setFormError] = React.useState<string | null>(null)
  const [conflict, setConflict] = React.useState(false)
  const { errors, isDirty } = form.formState

  const load = (fresh: User) => {
    form.reset(toValues(fresh))
    setBaseVersion(fresh.version)
  }

  const submit = form.handleSubmit((input) => {
    setFormError(null)
    setConflict(false)
    mutation.mutate(
      { input, version: baseVersion },
      {
        onSuccess: ({ user: saved }) => {
          load(saved)
          toast('Perfil atualizado.', 'success')
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') {
            setConflict(true)
            setFormError(error.message)
            return
          }
          setFormError(applyApiError(form, error))
        },
      },
    )
  })

  const loadCurrent = async () => {
    const fresh = await refresh().catch(() => null)
    if (!fresh) return setFormError('Não foi possível carregar os dados atuais. Tente novamente.')
    load(fresh)
    setConflict(false)
    setFormError(null)
    toast('Dados atuais carregados. Refaça suas alterações, se ainda quiser.', 'info')
  }

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-5" aria-busy={mutation.isPending}>
      {formError && (
        <div className="flex flex-col items-start gap-3">
          <FormError message={formError} />
          {conflict && (
            <Button type="button" size="sm" variant="outline" onClick={() => void loadCurrent()}>
              Carregar dados atuais
            </Button>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Nome de exibição" autoComplete="name" error={errors.displayName?.message} {...form.register('displayName')} />
        <TextField label="Nome de usuário" autoComplete="username" error={errors.username?.message} {...form.register('username')} />
        <TextField label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
        <TextField label="Nome ENS (opcional)" autoComplete="off" hint="Ex.: alice (sem .eth)" error={errors.ensName?.message} {...form.register('ensName')} />
        <TextField label="Apelido da carteira (opcional)" autoComplete="off" error={errors.walletAlias?.message} {...form.register('walletAlias')} />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => form.reset()} disabled={!isDirty || mutation.isPending}>
          Descartar alterações
        </Button>
        <Button type="submit" disabled={mutation.isPending || conflict}>
          {mutation.isPending && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          Salvar perfil
        </Button>
      </div>
    </form>
  )
}
