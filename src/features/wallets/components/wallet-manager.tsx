import { useQuery } from '@tanstack/react-query'
import * as React from 'react'

import type { User } from '@/contracts/account'
import type { Wallet } from '@/contracts/wallet'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Skeleton } from '@/shared/ui/skeleton'
import { toast } from '@/shared/ui/toaster'
import { useWalletMutation, walletsQueryOptions } from '../queries'
import { WalletForm, walletToValues, type WalletFormValues } from './wallet-form'

const link = 'text-base text-text-accent transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'

/** Copy of the primary wallet for "Igual à carteira principal" (the address must still be another one). */
function copyOf(primary: Wallet): Partial<WalletFormValues> {
  return { ...walletToValues(primary), displayName: '', address: '', secondaryAddress: '' }
}

/** Figma "Desktop / Carteiras": primary form, then the secondary block. Every change is confirmed by the API. */
export function WalletManager({ user }: { user: User }) {
  const wallets = useQuery(walletsQueryOptions(user.id))
  const mutation = useWalletMutation(user.id)
  const [addingSecondary, setAddingSecondary] = React.useState(false)
  const [sameAsPrimary, setSameAsPrimary] = React.useState(false)
  const [removing, setRemoving] = React.useState<Wallet | null>(null)
  const list = wallets.data?.wallets ?? []
  const primary = list.find((w) => w.slot === 'primary')
  const secondary = list.find((w) => w.slot === 'secondary')

  const makePrimary = (wallet: Wallet) =>
    mutation.mutate(
      { type: 'primary', id: wallet.id },
      {
        onSuccess: () => toast(`"${wallet.displayName}" agora é a carteira principal.`, 'success'),
        onError: (e) => toast(e.message, 'error'),
      },
    )

  const confirmRemove = () => {
    const wallet = removing
    if (!wallet) return
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
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando carteiras">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (wallets.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">{wallets.error.message}</p>
        <Button size="sm" onClick={() => void wallets.refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <section aria-labelledby="primary-title">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 id="primary-title" className="text-lg leading-6 font-bold">
              Carteira principal
            </h1>
            <p className="text-sm text-text-secondary">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
          </div>
          {primary ? (
            <button type="button" className={link} onClick={() => setRemoving(primary)}>
              Remover
            </button>
          ) : (
            <button type="button" className={link} onClick={() => document.querySelector<HTMLInputElement>('#primary-wallet input')?.focus()}>
              Adicionar
            </button>
          )}
        </div>
        <div id="primary-wallet" className="mt-[42px]">
          <WalletForm
            key={primary ? `${primary.id}:${primary.version}` : 'new-primary'}
            user={user}
            wallet={primary}
            onSaved={(saved) => toast(primary ? `Carteira "${saved.displayName}" atualizada.` : `Carteira "${saved.displayName}" cadastrada como principal.`, 'success')}
          />
        </div>
      </section>

      <section aria-labelledby="secondary-title" className="mt-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="secondary-title" className="text-lg leading-6 font-bold">
              Carteira secundária
            </h2>
            {!secondary && (
              <p className="text-sm text-text-secondary">
                {primary ? 'Você ainda não adicionou uma carteira secundária.' : 'Cadastre a carteira principal primeiro.'}
              </p>
            )}
          </div>
          {secondary ? (
            <div className="flex gap-5">
              <button type="button" className={link} onClick={() => makePrimary(secondary)} disabled={mutation.isPending}>
                Tornar principal
              </button>
              <button type="button" className={link} onClick={() => setRemoving(secondary)}>
                Remover
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-5">
              <label className="flex cursor-pointer items-center gap-2 text-base has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                <input
                  type="checkbox"
                  checked={sameAsPrimary}
                  disabled={!primary}
                  onChange={(e) => {
                    setSameAsPrimary(e.target.checked)
                    setAddingSecondary(true)
                  }}
                  className="size-[18px] appearance-none rounded-full border-2 border-primary checked:border-[5px] checked:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
                Igual à carteira principal
              </label>
              <button type="button" className={link} disabled={!primary} onClick={() => setAddingSecondary(true)}>
                Adicionar
              </button>
            </div>
          )}
        </div>
        {(secondary || (addingSecondary && primary)) && (
          <div className="mt-[42px]">
            <WalletForm
              key={secondary ? `${secondary.id}:${secondary.version}` : `new-secondary:${sameAsPrimary}`}
              user={user}
              wallet={secondary}
              defaults={!secondary && sameAsPrimary && primary ? copyOf(primary) : undefined}
              onSaved={(saved) => {
                if (!secondary) {
                  setAddingSecondary(false)
                  setSameAsPrimary(false)
                }
                toast(secondary ? `Carteira "${saved.displayName}" atualizada.` : `Carteira "${saved.displayName}" cadastrada como secundária.`, 'success')
              }}
              onCancel={
                secondary
                  ? undefined
                  : () => {
                      setAddingSecondary(false)
                      setSameAsPrimary(false)
                    }
              }
            />
          </div>
        )}
      </section>

      <Dialog open={removing !== null} onOpenChange={(open) => !open && !mutation.isPending && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover carteira?</DialogTitle>
            <DialogDescription>
              {removing?.slot === 'primary' && secondary
                ? `"${removing.displayName}" é a principal. A carteira secundária passa a ser a principal.`
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
