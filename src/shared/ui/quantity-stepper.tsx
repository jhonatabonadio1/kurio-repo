import { Minus, Plus } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

type Props = {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  /** What is being counted, for screen readers ("Quantidade de Emerald Ape #042"). */
  label: string
  size?: 'lg' | 'sm'
  disabled?: boolean
  className?: string
}

/**
 * − value + control. "lg" is the detail page (Figma 33×49.5 pills),
 * "sm" the cart and mobile buy bar (20×30). Buttons stop at the limits,
 * and the value is announced politely when it changes.
 */
export function QuantityStepper({ value, min = 1, max, onChange, label, size = 'lg', disabled = false, className }: Props) {
  const button = cn(
    'grid shrink-0 place-items-center rounded-full bg-primary text-ink transition-colors hover:bg-text-accent disabled:cursor-not-allowed disabled:opacity-40',
    size === 'lg' ? 'h-[49.5px] w-[33px] border border-ink shadow-[0_6.6px_9.9px_rgba(20,13,10,0.15)]' : 'h-[30px] w-5 rounded-md',
  )
  const icon = size === 'lg' ? 'size-5' : 'size-3.5'

  return (
    <div role="group" aria-label={label} className={cn('flex items-center', size === 'lg' ? 'gap-3' : 'gap-3', className)}>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Diminuir quantidade"
      >
        <Minus className={icon} strokeWidth={2.5} aria-hidden />
      </button>
      <output aria-live="polite" className={cn('min-w-[1.5ch] text-center tabular-nums', size === 'lg' ? 'text-xl leading-7' : 'text-base leading-6')}>
        <span className="sr-only">Quantidade: </span>
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Aumentar quantidade"
      >
        <Plus className={icon} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
}
