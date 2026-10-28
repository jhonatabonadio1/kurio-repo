import { Link } from '@tanstack/react-router'
import { Copy, X } from 'lucide-react'
import * as React from 'react'

import { CHAIN_LABELS } from '@/contracts/catalog'
import type { Order } from '@/contracts/order'
import { shortAddress } from '@/features/checkout/draft'
import { formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { NftArtwork } from '@/shared/ui/nft-artwork'
import { toast } from '@/shared/ui/toaster'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
/** Figma format: "29 Jul, 2026". */
const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`
}

/**
 * Confirmed order (Figma "Order Confirmation Modal", 578 wide): thank-you
 * header, transaction meta, items, fee and total. Everything comes from the
 * order's receipt snapshot, so later catalog changes never alter it.
 */
export function OrderReceipt({ order }: { order: Order }) {
  const [explorerOpen, setExplorerOpen] = React.useState(false)
  const { receipt } = order

  return (
    <article aria-labelledby="receipt-title" className="relative mx-auto w-full max-w-[578px] overflow-hidden rounded-xl border-b-[10px] border-primary bg-card">
      <Link to="/" aria-label="Fechar e voltar ao início" className="absolute top-4 right-4 rounded-md p-1 text-text-secondary hover:text-foreground">
        <X className="size-5" aria-hidden />
      </Link>
      <header className="flex flex-col items-center gap-4 px-6 pt-8 pb-5 text-center">
        <ThankYouIcon />
        <h1 id="receipt-title" className="text-lg text-text-secondary">
          Seus NFTs agora estão na sua carteira
        </h1>
      </header>

      <dl className="grid grid-cols-2 gap-4 border-y border-primary/70 px-6 py-4 text-sm sm:flex sm:justify-between sm:gap-0 sm:divide-x sm:divide-primary/70 sm:px-9 sm:whitespace-nowrap">
        <Meta label="ID da transação" value={shortAddress(order.txHash ?? '')} strong />
        <Meta label="Data" value={formatDate(order.updatedAt)} />
        <Meta label="Total" value={formatEth(receipt.total)} />
        <Meta label="Carteira" value={order.wallet.label.split(' · ')[1] ?? order.wallet.label} strong />
      </dl>

      <section aria-labelledby="tx-details" className="flex flex-col gap-3 px-6 py-5 sm:px-11">
        <h2 id="tx-details" className="text-base font-bold">
          Detalhes da transação
        </h2>
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="pb-3 font-bold">
                NFTs
              </th>
              <th scope="col" className="pb-3 text-center font-bold">
                Edições
              </th>
              <th scope="col" className="pb-3 text-right font-bold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {receipt.lines.map((line) => (
              <tr key={line.cartItemId}>
                <td className="py-2.5">
                  <div className="flex items-center gap-3">
                    <NftArtwork image={line.image} sizes="66px" className="size-[66px] rounded-md" />
                    <div>
                      <p className="font-bold">{line.name}</p>
                      <p className="mt-1 text-sm text-text-secondary">ID do token: {line.tokenId}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 text-center text-sm text-text-secondary">(x {line.quantity})</td>
                <td className="py-2.5 text-right text-lg font-bold text-text-accent">{formatEth(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto flex w-full max-w-[321px] flex-col gap-2 pt-2 text-base">
          {receipt.coupon && (
            <div className="flex justify-between">
              <dt>Desconto ({receipt.coupon.code})</dt>
              <dd>(-) {formatEth(receipt.discount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <dt>Taxa de rede</dt>
            <dd className="text-lg">{formatEth(receipt.networkFee)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-border pb-2 font-bold">
            <dt>Total</dt>
            <dd className="text-lg text-text-accent">{formatEth(receipt.total)}</dd>
          </div>
        </dl>
      </section>

      <footer className="flex flex-col items-center gap-6 px-6 pb-8 text-center sm:px-11">
        <p className="text-[15px] leading-6 text-text-secondary">
          Transação confirmada na {CHAIN_LABELS[order.network]}. A propriedade foi transferida para a sua carteira
          conectada. O recibo foi enviado para {order.buyer.email}.
        </p>
        <Button size="lg" className="text-base" onClick={() => setExplorerOpen(true)}>
          Ver no Etherscan
        </Button>
      </footer>

      <Dialog open={explorerOpen} onOpenChange={setExplorerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transação simulada</DialogTitle>
            <DialogDescription>
              Esta referência é gerada pela simulação e não existe em um explorador de blocos real.
            </DialogDescription>
          </DialogHeader>
          <code className="rounded-md bg-surface-dark p-3 text-xs break-all">{order.txHash}</code>
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard?.writeText(order.txHash ?? '')
              toast('Hash da transação copiado.', 'success')
            }}
          >
            <Copy className="size-4" aria-hidden /> Copiar hash
          </Button>
        </DialogContent>
      </Dialog>
    </article>
  )
}

function Meta({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-1 sm:px-3 sm:first:pl-0 sm:last:pr-0">
      <dt className={strong ? 'font-bold' : undefined}>{label}</dt>
      <dd className="text-text-secondary">{value}</dd>
    </div>
  )
}

/** Envelope with a "THANK YOU" card, drawn in the Figma's outline style. */
function ThankYouIcon() {
  return (
    <svg viewBox="0 0 96 90" width="96" height="90" aria-hidden className="text-text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M6 38 48 8l42 30v46a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V38Z" />
      <path d="M18 46V18h60v28" />
      <path d="M6 38l42 30 42-30M6 86l30-26M90 86 60 60" />
      <text x="48" y="31" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" stroke="none" fontFamily="inherit">
        THANK
      </text>
      <text x="48" y="43" textAnchor="middle" fontSize="10" fontWeight="700" fill="currentColor" stroke="none" fontFamily="inherit">
        YOU
      </text>
    </svg>
  )
}
