import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { CatalogFilters } from '@/features/catalog/components/catalog-filters'
import { CatalogToolbar } from '@/features/catalog/components/catalog-toolbar'
import { NftGrid } from '@/features/catalog/components/nft-grid'
import { nftListQueryOptions } from '@/features/catalog/queries'
import { HeroDesktop } from '@/features/home/hero'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { cn } from '@/shared/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { safeRedirect } from '../session'
import { LoginForm, OrDivider, RegisterForm, SocialSignIn } from './auth-forms'

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

  const expired = search.expired && (
    <p role="status" className="rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-sm">
      Sua sessão expirou. Entre novamente para continuar de onde parou.
    </p>
  )
  const form = (size: 'md' | 'lg') =>
    mode === 'login' ? <LoginForm size={size} onSuccess={done} /> : <RegisterForm size={size} onSuccess={done} />

  if (isDesktop) {
    return (
      <>
        <Backdrop />
        {/* Figma "Sign In Modal": 500 wide, 160 from the top, the page behind stays visible. */}
        <Dialog open onOpenChange={(open) => !open && close()}>
          <DialogContent
            overlayClassName="bg-ink/10 backdrop-blur-none"
            closeClassName="top-4 right-4 text-text-accent"
            className="top-[160px] flex max-h-[calc(100dvh-180px)] max-w-[500px] translate-y-0 flex-col gap-0 rounded-none px-20 pt-[45px] pb-[60px] sm:px-20 sm:pt-[45px] sm:pb-[60px]"
          >
            <ModeTabs mode={mode} search={search} />
            <DialogTitle className="sr-only">{COPY[mode].title}</DialogTitle>
            <DialogDescription className="mt-[38px] text-center text-sm leading-4 text-foreground">{COPY[mode].text}</DialogDescription>
            <div className="mt-8 flex flex-col gap-4">
              {expired}
              {form('md')}
            </div>
            <div className="mt-[31px]">
              <OrDivider bleed />
            </div>
            <div className="mt-5">
              <SocialSignIn size="md" />
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <section aria-labelledby="auth-title" className="mx-auto flex w-full max-w-[360px] flex-col pt-14 pb-10">
      <p aria-hidden className="py-10 text-center text-[32px] font-bold tracking-[0.1em]">
        KURIO
      </p>
      <h1 id="auth-title" className="mt-5 text-center text-lg font-bold">
        {COPY[mode].mobileTitle}
      </h1>
      <div className="mt-7 flex flex-col gap-4">
        {expired}
        {form('lg')}
      </div>
      <div className="mt-8">
        <OrDivider />
      </div>
      <div className="mt-4">
        <SocialSignIn size="lg" />
      </div>
      <p className="mt-10 text-center text-sm text-text-secondary">
        {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
        <Link to={mode === 'login' ? '/register' : '/login'} search={search} replace className="underline-offset-4 hover:text-foreground hover:underline">
          {mode === 'login' ? 'Crie uma conta' : 'Entre'}
        </Link>
      </p>
    </section>
  )
}

/** The Figma draws the modal over the home: hero and catalog, inert behind it. */
function Backdrop() {
  const list = useQuery(nftListQueryOptions({}))
  const noop = () => {}
  return (
    <div inert aria-hidden className="pointer-events-none flex flex-col gap-24 select-none">
      <HeroDesktop />
      <section className="lg:grid lg:grid-cols-[310px_1fr] lg:gap-12">
        <div className="hidden lg:block">
          <CatalogFilters facets={list.data?.facets} search={{}} update={noop} idPrefix="backdrop" />
        </div>
        <div className="flex flex-col gap-8">
          <CatalogToolbar search={{}} update={noop} activeFilterCount={0} onOpenFilters={noop} />
          <NftGrid query={list} hasFilters={false} onClearFilters={noop} />
        </div>
      </section>
    </div>
  )
}

/** "Entrar | Criar conta" switch at the top of the desktop modal. */
function ModeTabs({ mode, search }: { mode: AuthMode; search: AuthSearch }) {
  const item = 'text-xl leading-6 transition-colors'
  return (
    <nav aria-label="Acesso" className="flex items-center justify-center">
      <Link
        to="/login"
        search={search}
        replace
        aria-current={mode === 'login' ? 'page' : undefined}
        className={cn(item, mode === 'login' ? 'text-text-accent' : 'text-foreground hover:text-text-accent')}
      >
        Entrar
      </Link>
      <span aria-hidden className="mx-1 h-6 w-px bg-primary" />
      <Link
        to="/register"
        search={search}
        replace
        aria-current={mode === 'register' ? 'page' : undefined}
        className={cn(item, mode === 'register' ? 'text-text-accent' : 'text-foreground hover:text-text-accent')}
      >
        Criar conta
      </Link>
    </nav>
  )
}
