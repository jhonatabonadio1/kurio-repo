import { Link } from '@tanstack/react-router'
import { EllipsisVertical, Loader2, Plus } from 'lucide-react'
import * as React from 'react'

import type { User } from '@/contracts/account'
import type { Cart } from '@/contracts/cart'
import { CHAIN_LABELS } from '@/contracts/catalog'
import type { Wallet, WalletType } from '@/contracts/wallet'
import { WalletFormDialog } from '@/features/wallets/components/wallet-form-dialog'
import { cn } from '@/shared/lib/utils'
import { formatEth } from '@/shared/money/eth'
import { Skeleton } from '@/shared/ui/skeleton'
import { toast } from '@/shared/ui/toaster'
import { checkoutDraft, shortAddress } from '../draft'
import { useCheckoutFlow } from '../use-checkout-flow'
import { useWalletConnection } from '../use-wallet-connection'
import { CheckoutNotices } from './checkout-notices'
import { ProviderOptions } from './provider-options'
import { ConnectionStatus } from './connection-status'
import { ReviewDialog } from './review-dialog'

const ring = (checked: boolean) => (
  <span aria-hidden className={cn('mt-1 grid size-[18px] shrink-0 rounded-full border-2', checked ? 'border-[5px] border-primary' : 'border-text-secondary')} />
)

/**
 * Figma "Mobile / Pagamento": "Carteira conectada" (registered wallets),
 * "Carteira e rede", total and the "Confirmar compra" pill. The network is
 * the chosen wallet's network; buyer data comes from the wallet.
 */
export function MobileCheckout({ user, cart, wallets }: { user: User; cart: Cart; wallets: Wallet[] }) {
  const draft = React.useMemo(() => checkoutDraft.load(user.id), [user.id])
  const [pickedId, setPickedId] = React.useState(draft.walletId)
  const wallet = wallets.find((w) => w.id === pickedId) ?? wallets.find((w) => w.slot === 'primary') ?? wallets[0]
  const [pickedProvider, setPickedProvider] = React.useState<WalletType | undefined>(draft.provider)
  const provider = pickedProvider ?? wallet?.walletType ?? 'metamask'
  const network = wallet?.network ?? 'ethereum'
  const flow = useCheckoutFlow({ userId: user.id, cartVersion: cart.version, network, provider })
  const connection = useWalletConnection(`${wallet?.id ?? 'none'}|${network}|${provider}`, provider)
  const [adding, setAdding] = React.useState(false)
  const [walletError, setWalletError] = React.useState<string | null>(null)
  const quote = flow.quote.data

  const pick = (w: Wallet) => {
    setPickedId(w.id)
    setWalletError(null)
    checkoutDraft.update(user.id, { walletId: w.id })
  }

  const confirm = () => {
    if (!wallet) {
      setWalletError('Cadastre uma carteira para receber os NFTs.')
      document.getElementById('wallet-add')?.focus()
      return
    }
    const run = () =>
      void flow.confirm(async () => ({
        walletId: wallet.id,
        walletLabel: `${wallet.displayName} · ${wallet.secondaryAddress ?? shortAddress(wallet.address)}`,
        buyer: { fullName: wallet.profileName, email: wallet.email },
      }))
    // Not connected yet: the wallet prompt comes first, then the review.
    if (connection.connected) run()
    else connection.request(run)
  }

  return (
    <div className="flex flex-col gap-5 pb-28">
      <section aria-labelledby="connected-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="connected-title" className="text-[15px] font-bold">
            Carteira conectada
          </h2>
          <Link to="/profile/wallets" className="text-[13px] text-text-accent">
            Trocar carteira
          </Link>
        </div>
        {wallets.length === 0 ? (
          <div className={cn('flex flex-col items-start gap-3 rounded-lg border border-dashed p-4', walletError ? 'border-destructive' : 'border-border-soft')}>
            <p className="text-sm text-text-secondary">Você ainda não tem carteiras. Cadastre uma para receber os NFTs.</p>
            {walletError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {walletError}
              </p>
            )}
            <button id="wallet-add" type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-sm font-bold text-text-accent">
              <Plus className="size-4" aria-hidden /> Cadastrar carteira
            </button>
          </div>
        ) : (
          <div role="radiogroup" aria-labelledby="connected-title" className="flex flex-col gap-3">
            {wallets.map((w) => {
              const checked = w.id === wallet?.id
              return (
                <div key={w.id} className={cn('flex items-start gap-3 rounded-lg border bg-card p-4', checked ? 'border-primary/60' : 'border-transparent')}>
                  <label className="flex flex-1 cursor-pointer items-start gap-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring">
                    <input type="radio" name="wallet" checked={checked} onChange={() => pick(w)} className="sr-only" />
                    {ring(checked)}
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-sm font-bold">{w.displayName}</span>
                      <span className="truncate text-[13px] text-text-secondary">{w.secondaryAddress ?? shortAddress(w.address)}</span>
                      <span className="text-[13px] text-text-secondary">
                        {w.slot === 'primary' ? 'Rede principal' : 'Rede'} {CHAIN_LABELS[w.network]}
                      </span>
                    </span>
                  </label>
                  <Link to="/profile/wallets" aria-label={`Gerenciar ${w.displayName}`} className="-mr-1 grid size-8 place-items-center rounded-md text-text-secondary">
                    <EllipsisVertical className="size-4" aria-hidden />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="provider-title" className="flex flex-col gap-3">
        <h2 id="provider-title" className="text-[15px] font-bold">
          Carteira e rede
        </h2>
        <ProviderOptions
          layout="mobile"
          value={provider}
          onChange={(p) => {
            setPickedProvider(p)
            checkoutDraft.update(user.id, { provider: p })
          }}
        />
        <ConnectionStatus connection={connection} network={network} />
      </section>

      <div className="flex items-baseline justify-end gap-6 text-base font-bold" aria-live="polite">
        Total:
        <span className={cn('text-lg text-text-accent transition-opacity', flow.quote.isFetching && 'opacity-60')}>
          {quote ? formatEth(quote.total) : <Skeleton className="inline-block h-5 w-24 align-middle" />}
        </span>
      </div>

      <CheckoutNotices flow={flow} />

      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background via-background to-transparent px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={confirm}
          disabled={!quote || flow.busy || flow.quoteChanged}
          className="mx-auto flex h-[50px] w-full max-w-[366px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-[#b5743f] text-[15px] font-bold text-ink shadow-lg transition-opacity disabled:opacity-60"
        >
          {flow.busy && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          {flow.placing ? 'Enviando pedido…' : 'Confirmar compra'}
        </button>
      </div>

      <WalletFormDialog
        open={adding}
        onOpenChange={setAdding}
        user={user}
        defaults={{ walletType: provider }}
        onSaved={(saved) => {
          pick(saved)
          toast(`Carteira "${saved.displayName}" cadastrada.`, 'success')
        }}
      />
      <ReviewDialog flow={flow} />
    </div>
  )
}
