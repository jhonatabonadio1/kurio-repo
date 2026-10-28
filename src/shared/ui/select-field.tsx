import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/shared/lib/utils'
import { controlClass, describedBy, FieldShell, type FieldVariant } from './field'

type Props = React.ComponentProps<'select'> & {
  label: string
  requiredMark?: boolean
  error?: string
  options: readonly { value: string; label: string }[]
  /** Disabled first option shown while nothing is chosen ("Selecione uma rede"). */
  placeholder?: string
  variant?: FieldVariant
}

/** Native select styled like TextField (keyboard and screen-reader support for free). */
export const SelectField = React.forwardRef<HTMLSelectElement, Props>(function SelectField(
  { label, requiredMark, error, options, placeholder, variant = 'filled', id: idProp, className, ...props },
  ref,
) {
  const autoId = React.useId()
  const id = idProp ?? autoId
  return (
    <FieldShell id={id} label={label} requiredMark={requiredMark} variant={variant} error={error} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-required={requiredMark || undefined}
          aria-describedby={describedBy(id, error)}
          // An unchosen value shows in the placeholder colour.
          className={controlClass(variant, Boolean(error), cn('h-10 appearance-none pr-10 invalid:text-brand-secondary'))}
          required={placeholder ? true : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-foreground">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-text-secondary" />
      </div>
    </FieldShell>
  )
})
