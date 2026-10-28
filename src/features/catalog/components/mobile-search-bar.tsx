import { Search, SlidersHorizontal } from 'lucide-react'
import * as React from 'react'

import type { CatalogSearch } from '@/contracts/catalog'

/**
 * Mobile search (Figma "Search Bar"): typing updates ?q= after 300 ms,
 * replacing the history entry so Back is not flooded with keystrokes.
 */
export function MobileSearchBar({
  value,
  update,
  onOpenFilters,
  activeFilterCount,
}: {
  value: string | undefined
  update: (patch: Partial<CatalogSearch>, options?: { replace?: boolean }) => void
  onOpenFilters: () => void
  activeFilterCount: number
}) {
  const [term, setTerm] = React.useState(value ?? '')
  const lastSent = React.useRef(value ?? '')

  // Follow the URL when it changes elsewhere (Back button, "clear search").
  React.useEffect(() => {
    if ((value ?? '') !== lastSent.current) {
      lastSent.current = value ?? ''
      setTerm(value ?? '')
    }
  }, [value])

  React.useEffect(() => {
    const next = term.trim()
    if (next === lastSent.current) return
    const timer = setTimeout(() => {
      lastSent.current = next
      update({ q: next || undefined }, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [term, update])

  return (
    <div className="flex gap-2 md:hidden">
      <form role="search" className="flex h-[45px] flex-1 items-center gap-2 rounded-lg bg-card px-3" onSubmit={(e) => e.preventDefault()}>
        <Search className="size-[22px] shrink-0 text-text-secondary" aria-hidden />
        <label htmlFor="mobile-search" className="sr-only">
          Buscar NFTs
        </label>
        <input
          id="mobile-search"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          maxLength={60}
          placeholder="Explorar coleções"
          className="h-full w-full bg-transparent text-base placeholder:text-text-secondary focus:outline-none"
        />
      </form>
      <button
        type="button"
        onClick={onOpenFilters}
        className="relative grid size-[45px] shrink-0 place-items-center rounded-lg bg-primary text-ink"
        aria-label={activeFilterCount ? `Filtros, ${activeFilterCount} ativos` : 'Filtros'}
      >
        <SlidersHorizontal className="size-[22px]" aria-hidden />
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-foreground text-xs font-bold text-ink">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  )
}
