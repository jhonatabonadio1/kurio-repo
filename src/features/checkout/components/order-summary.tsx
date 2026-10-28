import { RefreshCw, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { EDITION_LABELS } from '@/contracts/catalog'
import type { Quote } from '@/contracts/quote'
import { cn } from '@/shared/lib/utils'
import { formatEth } from '@/shared/money/eth'
import { NftArtwork } from '@/shared/ui/nft-artwork'
import { Skeleton } from '@/shared/ui/skeleton'

/** Lines and totals of a quote. Every number comes from the API. */
export function OrderSummary({ quote, loading }: { quote: Quote | undefined; loading: boolean }) {
  if (!quote) {
    return (
      <div className="flex flex-col gap-3" aria-hidden={!loading}>
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-14" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
        <Skeleton className="mt-2 h-24 w-full" />
      </div>
    )
  }
  return (
    <div className={cn('flex flex-col gap-5 transition-opacity', loading && 'opacity-60')}>
      <ul aria-label="Itens do pedido" className="flex flex-col gap-3">
        {quote.lines.map((line) => (
          <li key={line.cartItemId} className="flex items-center gap-3 text-sm">
            <NftArtwork image={line.image} sizes="56px" className="size-14 rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{line.name}</p>
              <p className="text-text-secondary">
                Edição {EDITION_LABELS[line.editionKind]} · {line.quantity} × {formatEth(line.unitPrice)}
              </p>
            </div>
            <p className="shrink-0">{formatEth(line.lineTotal)}</p>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
        <Row label="Subtotal" value={formatEth(quote.subtotal)} />
        <Row label={quote.coupon ? `Desconto (${quote.coupon.code})` : 'Desconto do lançamento'} value={`(-) ${formatEth(quote.discount)}`} />
        <Row label="Taxa de rede" value={formatEth(quote.networkFee)} />
        <Row label="Total" value={formatEth(quote.total)} strong />
      </dl>
    </div>
  )
}

function Row({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-4', strong && 'mt-1 text-base font-bold')}>
      <dt>{label}</dt>
      <dd className={cn(strong && 'text-text-accent')}>{value}</dd>
    </div>
  )
}

/** Shown when the quote changed after the user reviewed it. */
export function QuoteChangedNotice({ previousTotal, quote, onAccept }: { previousTotal: string; quote: Quote; onAccept: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-md border border-primary/60 bg-primary/10 p-3 text-sm">
      <p className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-text-accent" aria-hidden />
        <span>
          Os valores mudaram desde a sua revisão: o total foi de {formatEth(previousTotal)} para{' '}
          <strong>{formatEth(quote.total)}</strong>. Confira e confirme os novos valores.
        </span>
      </p>
      <button type="button" onClick={onAccept} className="flex items-center gap-1.5 self-start font-bold text-text-accent underline">
        <RefreshCw className="size-3.5" aria-hidden /> Aceitar os novos valores
      </button>
    </div>
  )
}
