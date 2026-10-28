import { Check } from 'lucide-react'
import * as React from 'react'

import {
  CATEGORIES,
  CATEGORY_LABELS,
  CHAIN_LABELS,
  CHAINS,
  type CatalogSearch,
  type Facets,
} from '@/contracts/catalog'
import type { EthAmount } from '@/contracts/money'
import { cn } from '@/shared/lib/utils'
import { eth, formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { Slider } from '@/shared/ui/slider'

type Props = {
  facets: Facets | undefined
  search: CatalogSearch
  update: (patch: Partial<CatalogSearch>) => void
  className?: string
  idPrefix: string
}

/** Figma "Filters" panel (310 wide): collections, price range with Apply, networks. */
export function CatalogFilters({ facets, search, update, className, idPrefix }: Props) {
  const toggle = <T extends string>(list: T[] | undefined, value: T) =>
    list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value]

  return (
    <div className={cn('flex flex-col gap-10 bg-card p-5', className)}>
      <FilterGroup legend="Coleções">
        {CATEGORIES.map((category) => (
          <FilterOption
            key={category}
            id={`${idPrefix}-cat-${category}`}
            label={CATEGORY_LABELS[category]}
            count={facets?.categories[category]}
            checked={search.categories?.includes(category) ?? false}
            boldCount
            onChange={() => update({ categories: toggle(search.categories, category) })}
          />
        ))}
      </FilterGroup>

      <PriceFilter key={`${search.minPrice}-${search.maxPrice}-${facets?.priceRange.max}`} facets={facets} search={search} update={update} idPrefix={idPrefix} />

      <FilterGroup legend="Rede">
        {CHAINS.map((chain) => (
          <FilterOption
            key={chain}
            id={`${idPrefix}-chain-${chain}`}
            label={CHAIN_LABELS[chain]}
            count={facets?.chains[chain]}
            checked={search.chains?.includes(chain) ?? false}
            onChange={() => update({ chains: toggle(search.chains, chain) })}
          />
        ))}
      </FilterGroup>
    </div>
  )
}

function FilterGroup({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-lg leading-4 font-bold">{legend}</legend>
      <div className="flex flex-col">{children}</div>
    </fieldset>
  )
}

function FilterOption({
  id,
  label,
  count,
  checked,
  boldCount = false,
  onChange,
}: {
  id: string
  label: string
  count: number | undefined
  checked: boolean
  boldCount?: boolean
  onChange: () => void
}) {
  return (
    <div className="relative">
      <input id={id} type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-center justify-between rounded-md px-3 text-[15px] leading-10 text-text-secondary transition-colors hover:text-foreground',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-ring',
          checked && 'text-text-accent hover:text-text-accent',
        )}
      >
        {/* The check mark keeps the state readable without relying on colour. */}
        <span className="relative">
          {/* Sits in the left padding, so labels line up with the Figma. */}
          <Check
            className={cn('absolute top-1/2 -left-3 size-3 -translate-y-1/2 transition-opacity', checked ? 'opacity-100' : 'opacity-0')}
            aria-hidden
          />
          {label}
        </span>
        {count === undefined ? (
          <Skeleton className="h-3 w-7" />
        ) : (
          <span className={cn(boldCount && 'font-bold')}>
            <span className="sr-only">, </span>({count})
          </span>
        )}
      </label>
    </div>
  )
}

const toNumber = (v: string) => Number(v)
const toEthString = (n: number) => eth.of(n.toFixed(2)) as EthAmount

function PriceFilter({ facets, search, update, idPrefix }: Pick<Props, 'facets' | 'search' | 'update' | 'idPrefix'>) {
  const bounds = facets ? [toNumber(facets.priceRange.min), toNumber(facets.priceRange.max)] : null
  // Slider positions are UI-only numbers; the URL and API keep decimal strings.
  const [range, setRange] = React.useState<number[] | null>(() =>
    bounds
      ? [search.minPrice ? toNumber(search.minPrice) : bounds[0]!, search.maxPrice ? toNumber(search.maxPrice) : bounds[1]!]
      : null,
  )
  const active = Boolean(search.minPrice || search.maxPrice)
  const labelId = `${idPrefix}-price-label`

  const apply = () => {
    if (!bounds || !range) return
    const [lo, hi] = range as [number, number]
    update({
      minPrice: lo > bounds[0]! ? toEthString(lo) : undefined,
      maxPrice: hi < bounds[1]! ? toEthString(hi) : undefined,
    })
  }

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-3">
      <p id={labelId} className="mb-3 text-lg leading-4 font-bold">
        Faixa de preço
      </p>
      <div className="flex flex-col gap-3 pl-3">
        {bounds && range ? (
          <>
            <Slider
              min={bounds[0]}
              max={bounds[1]}
              step={0.01}
              minStepsBetweenThumbs={1}
              value={range}
              onValueChange={setRange}
              thumbLabels={['Preço mínimo', 'Preço máximo']}
            />
            <p className="text-[15px]" aria-live="polite">
              Preço: {formatEth(toEthString(range[0]!), { unit: false })} - {formatEth(toEthString(range[1]!))}
            </p>
            <div className="flex items-center gap-3">
              <Button size="sm" className="h-9 px-3 text-base" onClick={apply}>
                Aplicar
              </Button>
              {active && (
                <Button size="sm" variant="ghost" className="h-9 text-text-secondary" onClick={() => update({ minPrice: undefined, maxPrice: undefined })}>
                  Limpar
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <Skeleton className="h-[15px] w-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-9 w-20" />
          </>
        )}
      </div>
    </div>
  )
}
