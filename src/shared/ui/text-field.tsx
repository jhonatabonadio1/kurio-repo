import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/shared/lib/utils'
import { controlClass, describedBy, FieldShell, type FieldVariant } from './field'

type Props = Omit<React.ComponentProps<'input'>, 'size'> & {
  label: string
  /** Hide the label visually (Figma shows placeholders only); it stays for screen readers. */
  hideLabel?: boolean
  requiredMark?: boolean
  error?: string
  hint?: string
  size?: 'md' | 'lg'
  variant?: FieldVariant
  /** Password fields get an eye toggle unless false (Figma "Confirmar senha" has none). */
  revealable?: boolean
}

/**
 * Labelled input with its error tied by aria-describedby. Invalid state is
 * shown by border + message text, never by colour alone.
 */
export const TextField = React.forwardRef<HTMLInputElement, Props>(function TextField(
  { label, hideLabel = false, requiredMark, error, hint, size = 'md', variant = 'filled', revealable = true, id: idProp, className, type = 'text', ...props },
  ref,
) {
  const autoId = React.useId()
  const id = idProp ?? autoId
  const [revealed, setRevealed] = React.useState(false)
  const isPassword = type === 'password' && revealable

  return (
    <FieldShell id={id} label={label} hideLabel={hideLabel} requiredMark={requiredMark} variant={variant} error={error} hint={hint} className={className}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-required={requiredMark || undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={controlClass(variant, Boolean(error), cn(size === 'lg' ? 'h-[50px]' : 'h-10', isPassword && 'pr-12'))}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-pressed={revealed}
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-brand-secondary hover:text-foreground"
          >
            {revealed ? <Eye className="size-5" aria-hidden /> : <EyeOff className="size-5" aria-hidden />}
          </button>
        )}
      </div>
    </FieldShell>
  )
})
