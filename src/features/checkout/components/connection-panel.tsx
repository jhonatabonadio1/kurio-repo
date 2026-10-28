import { CheckCircle2, Link2Off, Plug, ShieldAlert } from 'lucide-react'

import { CHAIN_LABELS, CHAINS, type Chain } from '@/contracts/catalog'
import { WALLET_TYPE_LABELS, WALLET_TYPES, type WalletType } from '@/contracts/wallet'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import type { useWalletConnection } from '../use-wallet-connection'

const MARKS: Record<WalletType, string> = { walletconnect: 'W', metamask: 'M', coinbase: 'C' }

type Props = {
  network: Chain
  onNetworkChange: (network: Chain) => void
  provider: WalletType
  onProviderChange: (provider: WalletType) => void
  connection: ReturnType<typeof useWalletConnection>
}

/**
 * Network choice + wallet provider (Figma "Carteira e rede") + simulated
 * connection: the dialog lets the user approve or refuse, as a real wallet
 * would. Disconnecting is always possible.
 */
export function ConnectionPanel({ network, onNetworkChange, provider, onProviderChange, connection }: Props) {
  const { state } = connection
  const radio = (checked: boolean) =>
    cn(
      'flex cursor-pointer items-center gap-3 rounded-lg border bg-surface-dark px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
      checked ? 'border-primary' : 'border-transparent hover:border-border-soft',
    )
  const dot = (checked: boolean) => (
    <span aria-hidden className={cn('ml-auto size-4 shrink-0 rounded-full border-2', checked ? 'border-primary bg-primary' : 'border-text-secondary')} />
  )

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[15px] font-bold">Rede</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CHAINS.map((chain) => (
            <label key={chain} className={radio(chain === network)}>
              <input type="radio" name="network" checked={chain === network} onChange={() => onNetworkChange(chain)} className="sr-only" />
              {CHAIN_LABELS[chain]}
              {dot(chain === network)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[15px] font-bold">Carteira para conectar</legend>
        <div className="flex flex-col gap-2">
          {WALLET_TYPES.map((type) => (
            <label key={type} className={radio(type === provider)}>
              <input type="radio" name="provider" checked={type === provider} onChange={() => onProviderChange(type)} className="sr-only" />
              <span aria-hidden className="grid size-10 place-items-center rounded-full bg-primary/20 font-bold text-text-accent">
                {MARKS[type]}
              </span>
              {WALLET_TYPE_LABELS[type]}
              {dot(type === provider)}
            </label>
          ))}
        </div>
      </fieldset>

      <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-soft px-4 py-3 text-sm">
        {state.status === 'connected' ? (
          <>
            <span className="flex items-center gap-2 text-success">
              <CheckCircle2 className="size-4" aria-hidden />
              {WALLET_TYPE_LABELS[state.provider]} conectada na rede {CHAIN_LABELS[network]} (simulação)
            </span>
            <Button size="sm" variant="ghost" onClick={connection.disconnect}>
              <Link2Off className="size-4" aria-hidden /> Desconectar
            </Button>
          </>
        ) : (
          <>
            <span className={cn('flex items-center gap-2', state.status === 'refused' ? 'text-destructive' : 'text-text-secondary')}>
              {state.status === 'refused' ? <ShieldAlert className="size-4" aria-hidden /> : <Plug className="size-4" aria-hidden />}
              {state.status === 'refused'
                ? `${WALLET_TYPE_LABELS[state.provider]} recusou a conexão. Tente de novo ou escolha outra carteira.`
                : state.status === 'idle' && state.reason === 'changed'
                  ? 'Carteira ou rede alterada: conecte novamente.'
                  : state.status === 'idle' && state.reason === 'disconnected'
                    ? 'Carteira desconectada.'
                    : 'Nenhuma carteira conectada.'}
            </span>
            <Button size="sm" onClick={() => connection.request(provider)}>
              Conectar {WALLET_TYPE_LABELS[provider]}
            </Button>
          </>
        )}
      </div>

      <Dialog open={state.status === 'requesting'} onOpenChange={(open) => !open && state.status === 'requesting' && connection.refuse(state.provider)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{state.status === 'requesting' ? WALLET_TYPE_LABELS[state.provider] : ''} (simulação)</DialogTitle>
            <DialogDescription>
              A Kurio quer se conectar à sua carteira na rede {CHAIN_LABELS[network]}. Extensões reais estão fora do
              escopo: escolha como a carteira responde.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => state.status === 'requesting' && connection.refuse(state.provider)}>
              Recusar
            </Button>
            <Button onClick={() => state.status === 'requesting' && connection.approve(state.provider)}>Aprovar conexão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
