import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as React from 'react'
import { useForm } from 'react-hook-form'

import {
  LoginInputSchema,
  RegisterInputSchema,
  type LoginInput,
  type RegisterInput,
  type Session,
} from '@/contracts/account'
import { sessionStore } from '@/shared/auth/session-store'
import { applyApiError, FormError } from '@/shared/lib/form-errors'
import { cn } from '@/shared/lib/utils'
import { AppleIcon, GoogleIcon } from '@/shared/ui/brand-icons'
import { Button } from '@/shared/ui/button'
import { OutOfScopeLink } from '@/shared/ui/out-of-scope'
import { TextField } from '@/shared/ui/text-field'
import { toast } from '@/shared/ui/toaster'
import { login, register } from '../api'

type FormProps = { size: 'md' | 'lg'; onSuccess: () => void }

/** Stores the session and seeds the session query, so the header updates at once. */
function useSignIn() {
  const queryClient = useQueryClient()
  return (session: Session) => {
    sessionStore.signIn({ token: session.token, userId: session.user.id, expiresAt: session.expiresAt })
    queryClient.setQueryData(['session', session.token], { user: session.user, expiresAt: session.expiresAt })
  }
}

export function LoginForm({ size, onSuccess }: FormProps) {
  const signIn = useSignIn()
  const [formError, setFormError] = React.useState<string | null>(null)
  const form = useForm<LoginInput>({ resolver: zodResolver(LoginInputSchema), defaultValues: { email: '', password: '' } })
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      signIn(session)
      toast(`Bem-vindo de volta, ${session.user.displayName}!`, 'success')
      onSuccess()
    },
    onError: (error) => setFormError(applyApiError(form, error)),
  })
  const { errors } = form.formState

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        mutation.mutate(values)
      })}
      className="flex flex-col gap-3"
    >
      <TextField
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="contato@email.com"
        size={size}
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        hideLabel
        type="password"
        autoComplete="current-password"
        placeholder="Senha"
        size={size}
        error={errors.password?.message}
        {...form.register('password')}
      />
      <OutOfScopeLink feature="Recuperação de senha" className="self-end text-sm text-text-secondary hover:text-foreground">
        Esqueceu a senha?
      </OutOfScopeLink>
      <FormError message={formError} />
      <Button type="submit" size={size === 'lg' ? 'xl' : 'lg'} className="mt-3 h-[45px] w-full" disabled={mutation.isPending}>
        {mutation.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}

export function RegisterForm({ size, onSuccess }: FormProps) {
  const signIn = useSignIn()
  const [formError, setFormError] = React.useState<string | null>(null)
  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterInputSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (session) => {
      signIn(session)
      toast(`Conta criada. Bem-vindo, ${session.user.displayName}!`, 'success')
      onSuccess()
    },
    onError: (error) => setFormError(applyApiError(form, error)),
  })
  const { errors } = form.formState

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        mutation.mutate(values)
      })}
      className="flex flex-col gap-3"
    >
      <TextField
        label="Nome de usuário"
        hideLabel
        autoComplete="username"
        placeholder="Nome de usuário"
        hint="Letras minúsculas, números, _ ou ."
        size={size}
        error={errors.username?.message}
        {...form.register('username')}
      />
      <TextField
        label="E-mail"
        hideLabel
        type="email"
        autoComplete="email"
        placeholder="Digite seu e-mail"
        size={size}
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        hideLabel
        type="password"
        autoComplete="new-password"
        placeholder="Senha"
        hint="8 a 64 caracteres, com letras e números."
        size={size}
        error={errors.password?.message}
        {...form.register('password')}
      />
      <TextField
        label="Confirmar senha"
        hideLabel
        type="password"
        autoComplete="new-password"
        placeholder="Confirmar senha"
        size={size}
        error={errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />
      <FormError message={formError} />
      <Button type="submit" size={size === 'lg' ? 'xl' : 'lg'} className={cn('mt-3 h-[45px] w-full')} disabled={mutation.isPending}>
        {mutation.isPending ? 'Criando conta…' : size === 'lg' ? 'Criar perfil' : 'Criar conta'}
      </Button>
    </form>
  )
}

/** "Ou continue com" + two social buttons: drawn in the Figma, out of scope. */
export function SocialSignIn({ size }: { size: 'md' | 'lg' }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-sm text-text-secondary">
        <span className="h-px flex-1 bg-border" />
        Ou continue com
        <span className="h-px flex-1 bg-border" />
      </div>
      {[
        { provider: 'Google', Icon: GoogleIcon },
        { provider: 'Apple', Icon: AppleIcon },
      ].map(({ provider, Icon }) => (
        <OutOfScopeLink
          key={provider}
          feature={`Entrar com ${provider}`}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-md border border-border-soft text-sm font-medium transition-colors hover:border-primary',
            size === 'lg' ? 'h-[50px]' : 'h-10',
          )}
        >
          <Icon className="size-5 shrink-0" />
          Continuar com {provider}
        </OutOfScopeLink>
      ))}
    </div>
  )
}
