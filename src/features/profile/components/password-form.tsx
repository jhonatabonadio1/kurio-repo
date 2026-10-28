import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'

import { PasswordChangeSchema, type PasswordChange } from '@/contracts/account'
import { applyApiError, FormError } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { TextField } from '@/shared/ui/text-field'
import { toast } from '@/shared/ui/toaster'
import { useChangePassword } from '../mutations'

const EMPTY: PasswordChange = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function PasswordForm() {
  const form = useForm<PasswordChange>({ resolver: zodResolver(PasswordChangeSchema), defaultValues: EMPTY })
  const mutation = useChangePassword()
  const [formError, setFormError] = React.useState<string | null>(null)
  const { errors } = form.formState

  const submit = form.handleSubmit((input) => {
    setFormError(null)
    mutation.mutate(input, {
      onSuccess: ({ revokedSessions }) => {
        form.reset(EMPTY)
        toast(
          revokedSessions > 0
            ? `Senha alterada. ${revokedSessions === 1 ? '1 outra sessão foi encerrada' : `${revokedSessions} outras sessões foram encerradas`}.`
            : 'Senha alterada.',
          'success',
        )
      },
      onError: (error) => setFormError(applyApiError(form, error)),
    })
  })

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-5" aria-busy={mutation.isPending}>
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Senha atual" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register('currentPassword')} />
        <TextField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          hint="8 a 64 caracteres, com letras e números."
          error={errors.newPassword?.message}
          {...form.register('newPassword')}
        />
        <TextField label="Confirmar nova senha" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register('confirmPassword')} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          Alterar senha
        </Button>
      </div>
    </form>
  )
}
