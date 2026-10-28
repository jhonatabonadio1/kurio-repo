import { Link } from '@tanstack/react-router'

import { CATEGORY_LABELS, type Category } from '@/contracts/catalog'
import { OutOfScopeLink } from '@/shared/ui/out-of-scope'

const FEATURES = [
  { mark: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { mark: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { mark: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]
const PROFILE_LINKS = ['Minha coleção', 'Atividade', 'Estúdio do criador']
const HELP_LINKS = ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item']
const FOOTER_CATEGORIES: Category[] = ['arte-digital', 'fotografia', 'musica', 'arte-3d', 'utilidade']
const SOCIAL = [
  { mark: 'f', label: 'Facebook' },
  { mark: 'ig', label: 'Instagram' },
  { mark: 'x', label: 'X (Twitter)' },
  { mark: 'in', label: 'LinkedIn' },
  { mark: 'yt', label: 'YouTube' },
]

const heading = 'text-lg leading-4 font-bold'
const link = 'text-left text-sm leading-[30px] transition-colors hover:text-text-accent'

/** Footer from the Figma: feature medallions + newsletter, brand band, link columns. */
export function SiteFooter() {
  return (
    <footer className="mt-24 mb-[76px] md:mb-0">
      <div className="grid gap-8 bg-card p-6 md:grid-cols-2 md:p-8 lg:grid-cols-[1fr_1fr_1fr_1.35fr] lg:gap-0">
        {FEATURES.map((f) => (
          <div key={f.mark} className="flex flex-col gap-3 lg:border-r lg:border-primary lg:px-4">
            <span aria-hidden className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-ink">
              {f.mark}
            </span>
            <p className="text-[17px] leading-4 font-bold">{f.title}</p>
            <p className="max-w-[230px] text-sm leading-[22px] text-text-secondary">{f.text}</p>
          </div>
        ))}
        <div className="flex flex-col gap-4 lg:px-4">
          <p className={heading} id="newsletter-title">
            Antecipe-se ao próximo lançamento
          </p>
          <OutOfScopeLink
            feature="Newsletter"
            aria-describedby="newsletter-title"
            className="flex h-10 w-full items-center justify-between overflow-hidden rounded-md bg-surface-dark text-left shadow-[0_0_10px_rgba(10,6,4,0.45)]"
          >
            <span className="pl-3 text-sm text-brand-secondary">digite seu e-mail...</span>
            <span className="grid h-full w-[85px] place-items-center bg-primary text-lg font-bold text-ink">Enviar</span>
          </OutOfScopeLink>
          <p className="text-[13px] leading-[22px] text-text-secondary">
            Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
          </p>
        </div>
      </div>

      <div className="grid gap-3 bg-surface-dark px-6 py-6 text-sm md:grid-cols-4 md:items-center md:px-8">
        <span className="font-bold tracking-[0.1em]">KURIO</span>
        <span className="leading-[22px]">Feito para colecionadores, criadores e cultura</span>
        <a href="mailto:contato@email.com" className="underline-offset-4 hover:underline">
          contato@email.com
        </a>
        <span>+55 11 4002 8922</span>
      </div>

      <div className="grid grid-cols-2 gap-8 bg-card p-6 md:p-8 lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-[124px]">
        <nav aria-labelledby="footer-profile" className="flex flex-col gap-2">
          <p id="footer-profile" className={heading}>
            Meu perfil
          </p>
          <Link to="/profile" className={link}>
            Meu perfil
          </Link>
          {PROFILE_LINKS.map((label) => (
            <OutOfScopeLink key={label} feature={label} className={link}>
              {label}
            </OutOfScopeLink>
          ))}
          <Link to="/favorites" className={link}>
            Lista de interesse
          </Link>
        </nav>
        <nav aria-labelledby="footer-help" className="flex flex-col gap-2">
          <p id="footer-help" className={heading}>
            Central de ajuda
          </p>
          {HELP_LINKS.map((label) => (
            <OutOfScopeLink key={label} feature={label} className={link}>
              {label}
            </OutOfScopeLink>
          ))}
        </nav>
        <nav aria-labelledby="footer-collections" className="flex flex-col gap-2">
          <p id="footer-collections" className={heading}>
            Coleções
          </p>
          {FOOTER_CATEGORIES.map((category) => (
            <Link key={category} to="/" search={{ categories: [category] }} hash="catalogo" className={link}>
              {CATEGORY_LABELS[category]}
            </Link>
          ))}
        </nav>
        <div className="col-span-2 flex flex-col gap-8 lg:col-span-1">
          <div className="flex flex-col gap-5">
            <p className={heading}>Redes sociais</p>
            <ul className="flex gap-2.5">
              {SOCIAL.map((s) => (
                <li key={s.label}>
                  <OutOfScopeLink
                    feature={s.label}
                    aria-label={s.label}
                    className="grid size-[30px] place-items-center rounded-md border border-primary text-xs font-bold text-text-accent transition-colors hover:bg-primary hover:text-ink"
                  >
                    {s.mark}
                  </OutOfScopeLink>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <p className={heading}>Carteiras compatíveis</p>
            <p className="rounded-md border border-border-soft bg-surface-dark px-2 py-1.5 text-center text-[9px] font-bold tracking-[0.1px] whitespace-pre text-text-accent">
              {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
            </p>
          </div>
        </div>
      </div>

      <p className="py-1 text-center text-sm leading-[30px]">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
