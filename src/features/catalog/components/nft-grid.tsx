import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { RefreshCw, SearchX, WifiOff } from 'lucide-react'
import type { ReactNode } from 'react'

import { ApiError } from '@/contracts/api-error'
import { CATALOG_PAGE_SIZE, type NftListResponse } from '@/contracts/catalog'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { NftCard, NftCardSkeleton } from './nft-card'

const GRID = cn(
  'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-12 lg:gap-x-[34px] lg:gap-y-[72px]',
  // Mobile Figma: staggered columns (right column starts 32px lower).
  'max-md:[&>*:nth-child(even)]:translate-y-8 max-md:pb-8',
)

type Props = {
  query: UseQueryResult<NftListResponse>
  onClearFilters: () => void
  hasFilters: boolean
}

/** Catalog results with every state: loading, error, empty, page out of range, refreshing. */
export function NftGrid({ query, onClearFilters, hasFilters }: Props) {
  if (query.isPending) {
    return (
      <div className={GRID} aria-busy="true" aria-label="Carregando NFTs">
        {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
          <NftCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (query.isError && !query.data) {
    const offline = query.error instanceof ApiError && query.error.code === 'NETWORK_ERROR'
    return (
      <StateMessage
        icon={offline ? WifiOff : RefreshCw}
        title={offline ? 'Sem conexão' : 'Não foi possível carregar o catálogo'}
        text={query.error.message}
        role="alert"
      >
        <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      </StateMessage>
    )
  }

  const data = query.data!
  if (data.total === 0) {
    return (
      <StateMessage icon={SearchX} title="Nenhum NFT encontrado" text="Ajuste a busca ou os filtros para ver mais resultados.">
        {hasFilters && <Button onClick={onClearFilters}>Limpar filtros</Button>}
      </StateMessage>
    )
  }
  if (data.items.length === 0) {
    return (
      <StateMessage icon={SearchX} title="Esta página não existe" text={`O catálogo tem ${data.totalPages} páginas para esta busca.`}>
        <Button asChild>
          <Link from="/" to="/" search={(prev) => ({ ...prev, page: undefined })} hash="catalogo">
            Ir para a primeira página
          </Link>
        </Button>
      </StateMessage>
    )
  }

  const refreshing = query.isFetching && query.isPlaceholderData
  return (
    <div className="relative">
      {query.isError && (
        <p role="alert" className="mb-4 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive">
          Não foi possível atualizar os resultados.{' '}
          <button type="button" className="underline" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      <div
        className={cn(GRID, 'transition-opacity motion-reduce:transition-none', refreshing && 'opacity-60')}
        aria-busy={query.isFetching}
      >
        {data.items.map((nft, index) => (
          // The first cards are above the fold on desktop: load them first.
          <NftCard key={nft.id} nft={nft} priority={data.page === 1 && index < 3} />
        ))}
      </div>
    </div>
  )
}

function StateMessage({
  icon: Icon,
  title,
  text,
  children,
  role,
}: {
  icon: typeof SearchX
  title: string
  text: string
  children?: ReactNode
  role?: 'alert'
}) {
  return (
    <div role={role} className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-lg bg-card px-6 py-12 text-center">
      <Icon className="size-10 text-text-accent" aria-hidden />
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-sm leading-6 text-text-secondary">{text}</p>
      {children}
    </div>
  )
}
