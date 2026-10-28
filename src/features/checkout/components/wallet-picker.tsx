import { Link } from '@tanstack/react-router'
import { Check, Plus, Wallet as WalletIcon } from 'lucide-react'

import { CHAIN_LABELS } from '@/contracts/catalog'
import { WALLET_LIMIT, type Wallet } from '@/contracts/wallet'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { shortAddress } from '../draft'

type Props = {
  wallets: Wallet[]
  value: string | undefined
  onChange: (wallet: Wallet) => void
  onAdd: () => void
  /** Shown when the user tries to review without a wallet. */
  error?: string
}

/** Registered wallets as radio cards (Figma mobile "Wallet Card — Principal / Reserva"). */
export function WalletPicker({ wallets, value, onChange, onAdd, error }: Props) {
  const errorMessage = error && (
    <p id="wallet-error" role="alert" className="text-sm font-medium text-destructive">
      {error}
    </p>
  )
  if (wallets.length === 0) {
    return (
      <div className={cn('flex flex-col items-start gap-4 rounded-lg border border-dashed p-5', error ? 'border-destructive' : 'border-border-soft')}>
        <p className="text-sm text-text-secondary">
          Você ainda não tem carteiras. Cadastre uma para receber os NFTs desta compra.
        </p>
        {errorMessage}
        <Button type="button" id="wallet-add" onClick={onAdd} aria-describedby={error ? 'wallet-error' : undefined}>
          <Plus className="size-4" aria-hidden /> Cadastrar carteira
        </Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {errorMessage}
      <div role="radiogroup" aria-label="Carteira que recebe os NFTs" className="grid gap-3 sm:grid-cols-2">
        {wallets.map((wallet) => {
          const checked = wallet.id === value
          return (
            <label
              key={wallet.id}
              className={cn(
                'relative flex cursor-pointer items-start gap-4 rounded-lg border bg-surface-dark p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                checked ? 'border-primary' : 'border-transparent hover:border-border-soft',
              )}
            >
              <input type="radio" name="wallet" value={wallet.id} checked={checked} onChange={() => onChange(wallet)} className="sr-only" />
              <span aria-hidden className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2', checked ? 'border-primary bg-primary' : 'border-text-secondary')}>
                {checked && <Check className="size-2.5 text-ink" strokeWidth={4} />}
              </span>
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="flex items-center gap-2 font-bold">
                  <WalletIcon className="size-4 text-text-accent" aria-hidden />
                  {wallet.displayName}
                  {wallet.slot === 'primary' && <span className="rounded bg-primary/15 px-1.5 text-xs font-medium text-text-accent">principal</span>}
                </span>
                <span className="text-sm text-text-secondary">{wallet.secondaryAddress ?? shortAddress(wallet.address)}</span>
                <span className="text-sm text-text-secondary">Rede {CHAIN_LABELS[wallet.network]}</span>
              </span>
            </label>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {wallets.length < WALLET_LIMIT && (
          <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
            <Plus className="size-4" aria-hidden /> Adicionar outra carteira
          </Button>
        )}
        <Link to="/profile/wallets" className="text-xs font-bold text-text-accent underline">
          Gerenciar carteiras
        </Link>
      </div>
    </div>
  )
}
