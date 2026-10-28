import { EDITION_LABELS, type Edition } from '@/contracts/catalog'
import { cn } from '@/shared/lib/utils'
import { formatEth } from '@/shared/money/eth'

/**
 * "Edição:" pills (Figma). A native radio group: arrow keys move between
 * editions. Sold-out editions stay visible but cannot be picked.
 */
export function EditionPicker({
  editions,
  selectedId,
  onSelect,
  name,
}: {
  editions: Edition[]
  selectedId: string
  onSelect: (edition: Edition) => void
  name: string
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-[15px] leading-4 font-bold">Edição:</legend>
      <div className="flex flex-wrap gap-1.5">
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          const checked = edition.id === selectedId
          const id = `${name}-${edition.id}`
          return (
            <div key={edition.id}>
              <input
                id={id}
                type="radio"
                name={name}
                value={edition.id}
                checked={checked}
                disabled={soldOut}
                onChange={() => onSelect(edition)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                title={soldOut ? 'Edição esgotada' : formatEth(edition.price)}
                className={cn(
                  'flex h-7 cursor-pointer items-center rounded-full border border-border px-2 text-sm leading-4 text-text-secondary transition-colors hover:border-primary',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                  checked && 'border-text-accent font-medium text-text-accent',
                  soldOut && 'cursor-not-allowed line-through opacity-50 hover:border-border',
                )}
              >
                {EDITION_LABELS[edition.kind]}
                <span className="sr-only">
                  {soldOut ? ', esgotada' : `, ${formatEth(edition.price)}, ${edition.available === 9_999 ? 'aberta' : `${edition.available} disponíveis`}`}
                </span>
              </label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
