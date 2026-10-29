import { Star } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

/** Five stars filled to the average (partial fill on the last one). */
export function RatingStars({ average, count, compact = false }: { average: number; count: number; compact?: boolean }) {
  const label = `Avaliação ${average.toLocaleString('pt-BR')} de 5, ${count} avaliações de colecionadores`
  if (compact) {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-sm" role="img" aria-label={label}>
        <Star className="size-3.5 fill-text-accent text-text-accent" aria-hidden />
        <span aria-hidden>{average.toLocaleString('pt-BR')}</span>
        <span aria-hidden>({count})</span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1" role="img" aria-label={label}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, average - i))
        return (
          <span key={i} className="relative size-[15px]" aria-hidden>
            <Star className="absolute inset-0 size-[15px] text-text-secondary/40" fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="size-[15px] text-text-accent" fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        )
      })}
      <span aria-hidden className={cn('ml-0 text-[15px] whitespace-nowrap max-sm:hidden')}>
        {count} avaliações de colecionadores
      </span>
    </span>
  )
}
