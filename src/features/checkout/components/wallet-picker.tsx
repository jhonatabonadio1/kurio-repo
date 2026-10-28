import { Link } from '@tanstack/react-router'
import { Check, Wallet as WalletIcon } from 'lucide-react'

import { CHAIN_LABELS } from '@/contracts/catalog'
import type { Wallet } from '@/contracts/wallet'
import { cn } from '@/shared/lib/utils'
import { shortAddress } from '../draft'

/** Registered wallets as radio cards (Figma mobile "Wallet Card — Principal / Reserva"). */
export function WalletPicker({ wallets, value, onChange }: { wallets: Wallet[]; value: string | undefined; onChange: (wallet: Wallet) => void }) {
  if (wallets.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Você ainda não cadastrou carteiras.{' '}
        <Link to="/" hash="carteiras" className="font-bold text-text-accent underline">
          Cadastrar carteira
        </Link>
      </p>
    )
  }
  return (
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
  )
}
