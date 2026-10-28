import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/shared/lib/utils'

type Props = Omit<React.ComponentProps<'input'>, 'size'> & {
  label: string
  /** Hide the label visually (Figma shows placeholders only); it stays for screen readers. */
  hideLabel?: boolean
  error?: string
  hint?: string
  size?: 'md' | 'lg'
}

const inputClass = (size: 'md' | 'lg', invalid: boolean) =>
  cn(
    'w-full rounded-md border bg-surface-dark px-4 text-sm text-foreground transition-colors placeholder:text-brand-secondary',
    'focus-visible:border-ring focus-visible:outline-none',
    size === 'lg' ? 'h-[50px]' : 'h-10',
    invalid ? 'border-destructive' : 'border-transparent',
  )

/**
 * Labelled input with its error tied by aria-describedby. Invalid state is
 * shown by border + message text + icon-free wording, never by colour alone.
 */
export const TextField = React.forwardRef<HTMLInputElement, Props>(function TextField(
  { label, hideLabel = false, error, hint, size = 'md', id: idProp, className, type = 'text', ...props },
  ref,
) {
  const autoId = React.useId()
  const id = idProp ?? autoId
  const [revealed, setRevealed] = React.useState(false)
  const isPassword = type === 'password'
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-[15px] leading-4', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(inputClass(size, Boolean(error)), isPassword && 'pr-12')}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-pressed={revealed}
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-text-secondary hover:text-foreground"
          >
            {revealed ? <Eye className="size-5" aria-hidden /> : <EyeOff className="size-5" aria-hidden />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
})
