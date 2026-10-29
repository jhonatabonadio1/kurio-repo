import { CheckCircle2, Link2Off, Plug, ShieldAlert } from 'lucide-react'

import { CHAIN_LABELS, type Chain } from '@/contracts/catalog'
import { WALLET_TYPE_LABELS } from '@/contracts/wallet'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import type { WalletConnection } from '../use-wallet-connection'

const MESSAGES = {
  idle: 'Nenhuma carteira conectada.',
  changed: 'Carteira, rede ou app alterado: conecte novamente.',
  disconnected: 'Carteira desconectada.',
}

/**
 * Connection row under "Carteira e rede" (state not drawn in the Figma,
 * same visual language): connect, refuse and disconnect are simulated,
 * the dialog stands in for the wallet extension.
 */
export function ConnectionStatus({ connection, network }: { connection: WalletConnection; network: Chain }) {
  const label = WALLET_TYPE_LABELS[connection.provider]
  const { status } = connection

  return (
    <>
      <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm">
        {status === 'connected' ? (
          <>
            <span className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-4" aria-hidden />
              {label} conectada · {CHAIN_LABELS[network]} (simulação)
            </span>
            <button type="button" onClick={connection.disconnect} className="flex items-center gap-1.5 text-text-secondary hover:text-foreground">
              <Link2Off className="size-4" aria-hidden /> Desconectar
            </button>
          </>
        ) : (
          <>
            <span className={cn('flex items-center gap-2', status === 'refused' ? 'text-destructive' : 'text-text-secondary')}>
              {status === 'refused' ? <ShieldAlert className="size-4" aria-hidden /> : <Plug className="size-4" aria-hidden />}
              {status === 'refused' ? `${label} recusou a conexão.` : MESSAGES[status === 'requesting' ? 'idle' : status]}
            </span>
            <Button type="button" size="sm" onClick={() => connection.request()}>
              Conectar {label}
            </Button>
          </>
        )}
      </div>

      <Dialog open={status === 'requesting'} onOpenChange={(open) => !open && status === 'requesting' && connection.refuse()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label} (simulação)</DialogTitle>
            <DialogDescription>
              A Kurio quer se conectar à sua carteira na rede {CHAIN_LABELS[network]}. Extensões reais estão fora do escopo: escolha como a carteira responde.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={connection.refuse}>
              Recusar
            </Button>
            <Button onClick={connection.approve}>Aprovar conexão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
