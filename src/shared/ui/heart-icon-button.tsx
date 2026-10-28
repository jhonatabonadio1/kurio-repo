import { Heart } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

/** Small round heart (gallery, mobile hero, favorite cards). aria-pressed carries the state. */
export function HeartIconButton({
  active,
  disabled,
  onClick,
  size = 30,
  label,
}: {
  active: boolean
  disabled?: boolean
  onClick?: () => void
  size?: 30 | 35
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className="grid place-items-center rounded-full bg-foreground text-ink shadow-md transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
      style={{ width: size, height: size }}
    >
      <Heart className={cn('size-4', active && 'fill-primary text-primary')} aria-hidden />
    </button>
  )
}
