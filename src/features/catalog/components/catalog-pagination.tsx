import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

/** Up to 5 page numbers around the current one. */
function pageWindow(current: number, total: number): number[] {
  const size = Math.min(5, total)
  const start = Math.max(1, Math.min(current - 2, total - size + 1))
  return Array.from({ length: size }, (_, i) => start + i)
}

const box = 'grid size-[35px] place-items-center rounded-[4px] border border-border text-lg leading-4 transition-colors hover:border-primary'

/** Figma "Pagination": real links (?page=n), so history and new tabs work. */
export function CatalogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  const pageSearch = (p: number) => (prev: Record<string, unknown>) => ({ ...prev, page: p === 1 ? undefined : p })

  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <Link from="/" to="/" search={pageSearch(page - 1)} hash="catalogo" className={box} aria-label="Página anterior">
              <ChevronLeft className="size-[18px]" aria-hidden />
            </Link>
          </li>
        )}
        {pageWindow(page, totalPages).map((p) => (
          <li key={p}>
            <Link
              from="/"
              to="/"
              search={pageSearch(p)}
              hash="catalogo"
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={cn(box, p === page && 'border-primary bg-primary font-bold text-ink')}
            >
              {p}
            </Link>
          </li>
        ))}
        {page < totalPages && (
          <li>
            <Link from="/" to="/" search={pageSearch(page + 1)} hash="catalogo" className={box} aria-label="Próxima página">
              <ChevronRight className="size-[18px]" aria-hidden />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
