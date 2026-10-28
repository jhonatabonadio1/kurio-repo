import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { controlClass, describedBy, FieldShell, type FieldVariant } from './field'

type Props = Omit<React.ComponentProps<'input'>, 'size'> & {
  label?: string
  requiredMark?: boolean
  error?: string
  variant?: FieldVariant
}

/** "Nome ENS" from the Figma: a ".eth" domain picker next to the name. Only .eth exists today. */
export const EnsField = React.forwardRef<HTMLInputElement, Props>(function EnsField(
  { label = 'Nome ENS', requiredMark, error, variant = 'outline', id: idProp, className, ...props },
  ref,
) {
  const autoId = React.useId()
  const id = idProp ?? autoId
  return (
    <FieldShell id={id} label={label} requiredMark={requiredMark} variant={variant} error={error} className={className}>
      <div className="flex gap-2.5">
        <div className="relative w-[78px] shrink-0">
          <select aria-label="Domínio ENS" defaultValue=".eth" className={controlClass(variant, false, 'h-10 appearance-none px-3 pr-7 text-base')}>
            <option value=".eth">.eth</option>
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2" />
        </div>
        <input
          ref={ref}
          id={id}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-required={requiredMark || undefined}
          aria-describedby={describedBy(id, error)}
          className={controlClass(variant, Boolean(error), 'h-10 min-w-0')}
          {...props}
        />
      </div>
    </FieldShell>
  )
})
