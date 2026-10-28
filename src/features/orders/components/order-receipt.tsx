import { Link } from '@tanstack/react-router'
import { CheckCircle2, Copy, X } from 'lucide-react'
import * as React from 'react'

import { CHAIN_LABELS, EDITION_LABELS } from '@/contracts/catalog'
import type { Order } from '@/contracts/order'
import { shortAddress } from '@/features/checkout/draft'
import { formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { NftArtwork } from '@/shared/ui/nft-artwork'
import { toast } from '@/shared/ui/toaster'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

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
      <header className="flex flex-col items-center gap-4 border-b border-border px-6 pt-6 pb-5 text-center">
        <CheckCircle2 className="size-20 text-text-accent" strokeWidth={1.25} aria-hidden />
        <h1 id="receipt-title" className="text-base font-bold">
          Seus NFTs agora estão na sua carteira
        </h1>
      </header>

      <dl className="grid grid-cols-2 gap-4 border-b border-border px-9 py-4 text-sm sm:grid-cols-4 sm:divide-x sm:divide-border">
        <Meta label="ID da transação" value={shortAddress(order.txHash ?? '')} />
        <Meta label="Data" value={dateFormat.format(new Date(order.updatedAt))} />
        <Meta label="Total" value={formatEth(receipt.total)} />
        <Meta label="Carteira" value={order.wallet.label.split(' · ')[1] ?? order.wallet.label} />
      </dl>

      <section aria-labelledby="tx-details" className="flex flex-col gap-3 px-6 py-5 sm:px-11">
        <h2 id="tx-details" className="text-base font-bold">
          Detalhes da transação
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="pb-3 font-bold">
                NFTs
              </th>
              <th scope="col" className="pb-3 font-bold">
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
                      <p>{line.name}</p>
                      <p className="mt-1 text-text-secondary">ID do token: {line.tokenId}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5">
                  {EDITION_LABELS[line.editionKind]} <span className="text-text-secondary">(x {line.quantity})</span>
                </td>
                <td className="py-2.5 text-right">{formatEth(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto flex w-full max-w-[321px] flex-col gap-3 pt-2 text-sm">
          {receipt.coupon && (
            <div className="flex justify-between">
              <dt>Desconto ({receipt.coupon.code})</dt>
              <dd>(-) {formatEth(receipt.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Taxa de rede</dt>
            <dd>{formatEth(receipt.networkFee)}</dd>
          </div>
          <div className="flex justify-between font-bold">
            <dt>Total</dt>
            <dd className="text-text-accent">{formatEth(receipt.total)}</dd>
          </div>
        </dl>
      </section>

      <footer className="flex flex-col items-center gap-5 border-t border-border px-6 pt-5 pb-8 text-center sm:px-11">
        <p className="text-sm leading-6 text-text-secondary">
          Transação confirmada na {CHAIN_LABELS[order.network]}. A propriedade foi transferida para a sua carteira
          conectada. O recibo foi enviado para {order.buyer.email}.
        </p>
        <Button variant="outline" size="lg" onClick={() => setExplorerOpen(true)}>
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:px-4 sm:first:pl-0">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  )
}
