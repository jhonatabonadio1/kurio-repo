import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'

import {
  CATALOG_SORT_LABELS,
  CATALOG_SORTS,
  CATALOG_TAB_LABELS,
  CATALOG_TABS,
  type CatalogSearch,
  type CatalogSort,
} from '@/contracts/catalog'
import { cn } from '@/shared/lib/utils'

type Props = {
  search: CatalogSearch
  update: (patch: Partial<CatalogSearch>) => void
  activeFilterCount: number
  onOpenFilters: () => void
}

/** Figma "Toolbar": tabs on the left, sort on the right; filters button below lg. */
export function CatalogToolbar({ search, update, activeFilterCount, onOpenFilters }: Props) {
  const tab = search.tab ?? 'all'
  const sort = search.sort ?? 'recent'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div role="group" aria-label="Mostrar" className="-mx-1 flex gap-5 overflow-x-auto px-1 pb-2 text-[15px] leading-4 font-medium">
          {CATALOG_TABS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => update({ tab: value })}
              className={cn(
                'relative shrink-0 rounded-sm py-1 whitespace-nowrap transition-colors hover:text-text-accent',
                tab === value
                  ? 'text-text-accent after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:bg-primary'
                  : 'text-foreground',
              )}
            >
              {CATALOG_TAB_LABELS[value]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenFilters}
            className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm transition-colors hover:border-primary lg:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filtros
            {activeFilterCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-xs font-bold text-ink">
                <span className="sr-only">(</span>
                {activeFilterCount}
                <span className="sr-only"> ativos)</span>
              </span>
            )}
          </button>
          <label className="flex items-center text-[15px] whitespace-nowrap">
            <span className="max-sm:sr-only">Ordenar por:</span>
            <span className="relative">
              <select
                value={sort}
                onChange={(e) => update({ sort: e.target.value as CatalogSort })}
                className="h-10 cursor-pointer appearance-none rounded-md bg-transparent py-0 pr-7 pl-1 text-[15px] text-foreground hover:text-text-accent max-sm:border max-sm:border-border max-sm:pl-3"
              >
                {CATALOG_SORTS.map((value) => (
                  <option key={value} value={value} className="bg-card">
                    {CATALOG_SORT_LABELS[value]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-1 size-4 -translate-y-1/2" aria-hidden />
            </span>
          </label>
        </div>
      </div>

      {search.q && (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          Resultados para <strong className="text-foreground">“{search.q}”</strong>
          <button
            type="button"
            onClick={() => update({ q: undefined })}
            className="grid size-6 place-items-center rounded-full border border-border hover:border-primary"
            aria-label={`Limpar busca “${search.q}”`}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </p>
      )}
    </div>
  )
}
