import * as React from 'react'

import { cn } from '@/shared/lib/utils'

/**
 * filled: auth screens and mobile frames (surface-dark box).
 * outline: desktop account and checkout frames (thin border on the page).
 */
export type FieldVariant = 'filled' | 'outline'

export function controlClass(variant: FieldVariant, invalid: boolean, extra?: string) {
  return cn(
    'w-full rounded-md border px-4 text-sm text-foreground transition-colors placeholder:text-brand-secondary',
    'focus-visible:border-ring focus-visible:outline-none disabled:opacity-60',
    variant === 'outline' ? 'bg-transparent' : 'bg-surface-dark',
    invalid ? 'border-destructive' : variant === 'outline' ? 'border-border' : 'border-transparent',
    extra,
  )
}

type ShellProps = {
  id: string
  label: string
  hideLabel?: boolean
  /** Figma's salmon asterisk. Decorative: the input itself gets aria-required. */
  requiredMark?: boolean
  variant: FieldVariant
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}

/** Label + control + hint/error, ids wired for aria-describedby. */
export function FieldShell({ id, label, hideLabel, requiredMark, variant, error, hint, className, children }: ShellProps) {
  return (
    <div className={cn('flex flex-col', variant === 'outline' ? 'gap-2.5' : 'gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(variant === 'outline' ? 'text-base leading-5' : 'text-[15px] leading-4', hideLabel && 'sr-only')}
      >
        {label}
        {requiredMark && (
          <span aria-hidden className="text-lg leading-none text-destructive">
            *
          </span>
        )}
      </label>
      {children}
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
}

export const describedBy = (id: string, error?: string, hint?: string) =>
  [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined
