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
import { FacebookIcon, GoogleIcon } from '@/shared/ui/brand-icons'
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
        variant="outline"
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
        variant="outline"
        error={errors.password?.message}
        {...form.register('password')}
      />
      <OutOfScopeLink feature="Recuperação de senha" className="self-end text-[15px] text-text-accent hover:text-foreground">
        Esqueceu a senha?
      </OutOfScopeLink>
      <FormError message={formError} />
      <Button type="submit" size="lg" className={cn('mt-3 w-full text-base', size === 'lg' ? 'h-[50px]' : 'h-[45px]')} disabled={mutation.isPending}>
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
        size={size}
        variant="outline"
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
        variant="outline"
        error={errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Senha"
        hideLabel
        type="password"
        autoComplete="new-password"
        placeholder="Senha"
        size={size}
        variant="outline"
        error={errors.password?.message}
        {...form.register('password')}
      />
      <TextField
        label="Confirmar senha"
        hideLabel
        type="password"
        autoComplete="new-password"
        placeholder="Confirmar senha"
        revealable={false}
        size={size}
        variant="outline"
        error={errors.confirmPassword?.message}
        {...form.register('confirmPassword')}
      />
      <FormError message={formError} />
      <Button type="submit" size="lg" className={cn('mt-3 w-full text-base', size === 'lg' ? 'h-[50px]' : 'h-[45px]')} disabled={mutation.isPending}>
        {mutation.isPending ? 'Criando conta…' : size === 'lg' ? 'Criar perfil' : 'Criar conta'}
      </Button>
    </form>
  )
}

/** Two social buttons (Figma: Google and Facebook), out of scope. The "Ou continue com" divider is drawn by the screen. */
export function SocialSignIn({ size }: { size: 'md' | 'lg' }) {
  return (
    <div className="flex flex-col gap-3">
      {[
        { provider: 'Google', Icon: GoogleIcon },
        { provider: 'Facebook', Icon: FacebookIcon },
      ].map(({ provider, Icon }) => (
        <OutOfScopeLink
          key={provider}
          feature={`Entrar com ${provider}`}
          className={cn(
            'flex w-full items-center justify-center gap-2.5 rounded-md border border-border text-text-secondary transition-colors hover:border-primary hover:text-foreground',
            size === 'lg' ? 'h-10 text-[13px]' : 'h-10 text-sm',
          )}
        >
          <Icon className="size-5 shrink-0" />
          Continuar com {provider}
        </OutOfScopeLink>
      ))}
    </div>
  )
}

/** "Ou continue com" over a line. `bleed` = the line runs edge to edge of the modal (Figma desktop). */
export function OrDivider({ bleed = false }: { bleed?: boolean }) {
  return (
    <div className={cn('relative flex justify-center text-sm', bleed ? '-mx-20' : '')}>
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border" />
      <span className="relative bg-card px-3 text-foreground max-md:bg-background">Ou continue com</span>
    </div>
  )
}
