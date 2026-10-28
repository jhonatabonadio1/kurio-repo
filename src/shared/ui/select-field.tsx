import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/shared/lib/utils'

type Props = React.ComponentProps<'select'> & {
  label: string
  error?: string
  options: readonly { value: string; label: string }[]
}

/** Native select styled like TextField (keyboard and screen-reader support for free). */
export const SelectField = React.forwardRef<HTMLSelectElement, Props>(function SelectField(
  { label, error, options, id: idProp, className, ...props },
  ref,
) {
  const autoId = React.useId()
  const id = idProp ?? autoId
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[15px] leading-4">
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'h-10 w-full appearance-none rounded-md border bg-surface-dark pr-10 pl-4 text-sm text-foreground transition-colors',
            'focus-visible:border-ring focus-visible:outline-none',
            error ? 'border-destructive' : 'border-transparent',
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary" />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
})
