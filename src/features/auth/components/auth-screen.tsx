import { Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { HeroDesktop } from '@/features/home/hero'
import { PromoCards } from '@/features/home/promo-cards'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { cn } from '@/shared/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { safeRedirect } from '../session'
import { LoginForm, RegisterForm, SocialSignIn } from './auth-forms'

export type AuthMode = 'login' | 'register'

/** ?redirect=/checkout&expired=true — shared by /login and /register. */
export const AuthSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  expired: z
    .preprocess((v) => v === true || v === 'true', z.boolean())
    .optional()
    .catch(undefined),
})
export type AuthSearch = z.infer<typeof AuthSearchSchema>

const COPY: Record<AuthMode, { title: string; mobileTitle: string; text: string }> = {
  login: {
    title: 'Entrar',
    mobileTitle: 'Entrar',
    text: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  register: {
    title: 'Criar conta',
    mobileTitle: 'Criar perfil de colecionador',
    text: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
}

/**
 * Figma: a 500 px modal over the marketplace on desktop ("Sign In Modal"),
 * a full page with the wordmark on mobile. The desktop background is the
 * home hero, inert (not focusable, hidden from screen readers).
 */
export function AuthScreen({ mode, search }: { mode: AuthMode; search: AuthSearch }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const navigate = useNavigate()
  const target = safeRedirect(search.redirect)
  const done = () => void navigate({ href: target, replace: true })
  const close = () => void navigate({ href: search.redirect ? target : '/' })
  useDocumentTitle(`${COPY[mode].title} — Kurio`)

  const content = (size: 'md' | 'lg') => (
    <div className="flex flex-col gap-6">
      {search.expired && (
        <p role="status" className="rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-sm">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      {mode === 'login' ? <LoginForm size={size} onSuccess={done} /> : <RegisterForm size={size} onSuccess={done} />}
      <SocialSignIn size={size} />
    </div>
  )

  if (isDesktop) {
    return (
      <>
        <div inert aria-hidden className="pointer-events-none flex flex-col gap-24 select-none">
          <HeroDesktop />
          <PromoCards />
        </div>
        <Dialog open onOpenChange={(open) => !open && close()}>
          <DialogContent className="max-w-[500px] gap-8 px-20 pt-12 pb-12">
            <div className="flex flex-col items-center gap-10 text-center">
              <ModeTabs mode={mode} search={search} />
              <DialogTitle className="sr-only">{COPY[mode].title}</DialogTitle>
              <DialogDescription className="text-sm leading-4">{COPY[mode].text}</DialogDescription>
            </div>
            {content('md')}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <section aria-labelledby="auth-title" className="mx-auto flex w-full max-w-[358px] flex-col gap-10 pt-14 pb-10">
      <p aria-hidden className="py-10 text-center text-[32px] font-bold tracking-[0.1em]">
        KURIO
      </p>
      <h1 id="auth-title" className="text-center text-lg font-bold">
        {COPY[mode].mobileTitle}
      </h1>
      {content('lg')}
      <p className="text-center text-base">
        {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
        <Link
          to={mode === 'login' ? '/register' : '/login'}
          search={search}
          replace
          className="font-bold text-text-accent underline-offset-4 hover:underline"
        >
          {mode === 'login' ? 'Crie uma conta' : 'Entre'}
        </Link>
      </p>
    </section>
  )
}

/** "Entrar | Criar conta" switch at the top of the desktop modal. */
function ModeTabs({ mode, search }: { mode: AuthMode; search: AuthSearch }) {
  const item = 'text-base leading-4 transition-colors'
  return (
    <nav aria-label="Acesso" className="flex items-center gap-2">
      <Link
        to="/login"
        search={search}
        replace
        aria-current={mode === 'login' ? 'page' : undefined}
        className={cn(item, mode === 'login' ? 'font-bold text-text-accent' : 'text-text-secondary hover:text-foreground')}
      >
        Entrar
      </Link>
      <span aria-hidden className="mx-2 h-5 w-px bg-border-soft" />
      <Link
        to="/register"
        search={search}
        replace
        aria-current={mode === 'register' ? 'page' : undefined}
        className={cn(item, mode === 'register' ? 'font-bold text-text-accent' : 'text-text-secondary hover:text-foreground')}
      >
        Criar conta
      </Link>
    </nav>
  )
}
