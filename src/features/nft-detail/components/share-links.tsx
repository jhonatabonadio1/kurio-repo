import { Mail } from 'lucide-react'

/**
 * "Compartilhar este NFT": real share links (new tab / mail client).
 * lucide-react 1.x has no brand icons, so LinkedIn and X use text marks.
 */
export function ShareLinks({ name }: { name: string }) {
  const url = typeof window === 'undefined' ? '' : window.location.href.split('?')[0]!
  const text = `${name} na Kurio`
  const links = [
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, mark: 'in' },
    { label: 'e-mail', href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`, mark: null },
    { label: 'X (Twitter)', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, mark: 'X' },
  ]
  return (
    <div className="flex items-center gap-2">
      <p className="text-[15px] leading-4 font-bold">Compartilhar este NFT:</p>
      <ul className="flex items-center gap-1">
        {links.map(({ label, href, mark }) => (
          <li key={label}>
            <a
              href={href}
              target={href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              aria-label={`Compartilhar por ${label}${href.startsWith('mailto') ? '' : ' (abre em nova aba)'}`}
              className="grid size-7 place-items-center rounded-md transition-colors hover:text-text-accent"
            >
              {mark ? <span aria-hidden className="text-sm font-bold">{mark}</span> : <Mail className="size-4" aria-hidden />}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
