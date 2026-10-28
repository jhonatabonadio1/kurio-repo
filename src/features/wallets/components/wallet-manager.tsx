import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Star, Trash2, Wallet as WalletIcon } from 'lucide-react'
import * as React from 'react'

import type { User } from '@/contracts/account'
import { CHAIN_LABELS } from '@/contracts/catalog'
import { WALLET_LIMIT, WALLET_TYPE_LABELS, type Wallet } from '@/contracts/wallet'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Skeleton } from '@/shared/ui/skeleton'
import { toast } from '@/shared/ui/toaster'
import { useWalletMutation, walletsQueryOptions } from '../queries'
import { WalletFormDialog } from './wallet-form-dialog'

type Editing = { mode: 'create' } | { mode: 'edit'; wallet: Wallet } | null

/** Profile › Carteiras: primary + secondary, every change confirmed by the API. */
export function WalletManager({ user }: { user: User }) {
  const wallets = useQuery(walletsQueryOptions(user.id))
  const mutation = useWalletMutation(user.id)
  const [editing, setEditing] = React.useState<Editing>(null)
  const [removing, setRemoving] = React.useState<Wallet | null>(null)
  const list = wallets.data?.wallets ?? []

  const makePrimary = (wallet: Wallet) =>
    mutation.mutate(
      { type: 'primary', id: wallet.id },
      {
        onSuccess: () => toast(`"${wallet.displayName}" agora é a carteira principal.`, 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    )

  const confirmRemove = () => {
    if (!removing) return
    const wallet = removing
    mutation.mutate(
      { type: 'delete', id: wallet.id },
      {
        onSuccess: () => {
          setRemoving(null)
          toast(`Carteira "${wallet.displayName}" removida.`, 'success')
        },
        onError: (e) => toast(e.message, 'error'),
      },
    )
  }

  if (wallets.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Carregando carteiras">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
    )
  }
  if (wallets.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg bg-card p-6">
        <p className="text-sm text-destructive">{wallets.error.message}</p>
        <Button size="sm" onClick={() => void wallets.refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary" aria-live="polite">
          {list.length} de {WALLET_LIMIT} carteiras. A principal vem selecionada no pagamento.
        </p>
        {list.length < WALLET_LIMIT && (
          <Button size="sm" onClick={() => setEditing({ mode: 'create' })}>
            <Plus className="size-4" aria-hidden /> Cadastrar carteira
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-soft px-6 py-12 text-center">
          <WalletIcon className="size-10 text-text-accent" aria-hidden />
          <h2 className="text-lg font-bold">Nenhuma carteira cadastrada</h2>
          <p className="max-w-sm text-sm leading-6 text-text-secondary">Cadastre uma carteira para receber os NFTs que você comprar.</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((wallet) => (
            <li key={wallet.id} className="flex flex-col gap-4 rounded-lg bg-card p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex min-w-0 items-center gap-2 font-bold">
                  <WalletIcon className="size-4 shrink-0 text-text-accent" aria-hidden />
                  <span className="truncate">{wallet.displayName}</span>
                </h2>
                <span className="shrink-0 rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-text-accent">
                  {wallet.slot === 'primary' ? 'Principal' : 'Reserva'}
                </span>
              </div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                <dt className="text-text-secondary">Apelido</dt>
                <dd>{wallet.alias}</dd>
                <dt className="text-text-secondary">Rede</dt>
                <dd>{CHAIN_LABELS[wallet.network]}</dd>
                <dt className="text-text-secondary">Tipo</dt>
                <dd>{WALLET_TYPE_LABELS[wallet.walletType]}</dd>
                <dt className="text-text-secondary">Endereço</dt>
                <dd className="break-all">{wallet.address}</dd>
                {wallet.secondaryAddress && (
                  <>
                    <dt className="text-text-secondary">Secundário</dt>
                    <dd className="break-all">{wallet.secondaryAddress}</dd>
                  </>
                )}
              </dl>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing({ mode: 'edit', wallet })} aria-label={`Editar ${wallet.displayName}`}>
                  <Pencil className="size-4" aria-hidden /> Editar
                </Button>
                {wallet.slot !== 'primary' && (
                  <Button size="sm" variant="outline" onClick={() => makePrimary(wallet)} disabled={mutation.isPending}>
                    <Star className="size-4" aria-hidden /> Tornar principal
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setRemoving(wallet)} aria-label={`Remover ${wallet.displayName}`}>
                  <Trash2 className="size-4" aria-hidden /> Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <WalletFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        user={user}
        wallet={editing?.mode === 'edit' ? editing.wallet : undefined}
        onSaved={(saved) => toast(editing?.mode === 'edit' ? `Carteira "${saved.displayName}" atualizada.` : `Carteira "${saved.displayName}" cadastrada.`, 'success')}
      />

      <Dialog open={removing !== null} onOpenChange={(open) => !open && !mutation.isPending && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover carteira?</DialogTitle>
            <DialogDescription>
              {removing?.slot === 'primary' && list.length > 1
                ? `"${removing.displayName}" é a principal. A outra carteira passa a ser a principal.`
                : `"${removing?.displayName ?? ''}" deixa de aparecer no pagamento. Pedidos já feitos não mudam.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmRemove} disabled={mutation.isPending}>
              Remover carteira
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
