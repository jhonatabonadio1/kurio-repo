import { Mail } from 'lucide-react'

import { LinkedinGlyph, TwitterGlyph } from '@/shared/ui/brand-icons'

/**
 * "Compartilhar este NFT": real share links (new tab / mail client).
 * Icon-only links: the name comes from aria-label (no visible text that the
 * label would have to repeat).
 */
export function ShareLinks({ name }: { name: string }) {
  const url = typeof window === 'undefined' ? '' : window.location.href.split('?')[0]!
  const text = `${name} na Kurio`
  const links = [
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, Icon: LinkedinGlyph },
    { label: 'e-mail', href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`, Icon: Mail },
    { label: 'X (Twitter)', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, Icon: TwitterGlyph },
  ]
  return (
    <div className="flex items-center gap-2">
      <p className="text-[15px] leading-4 font-bold">Compartilhar este NFT:</p>
      <ul className="flex items-center gap-1">
        {links.map(({ label, href, Icon }) => (
          <li key={label}>
            <a
              href={href}
              target={href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              aria-label={`Compartilhar por ${label}${href.startsWith('mailto') ? '' : ' (abre em nova aba)'}`}
              className="grid size-7 place-items-center rounded-md transition-colors hover:text-text-accent"
            >
              <Icon className="size-4" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
