import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { useForm, useWatch } from 'react-hook-form'

import type { User } from '@/contracts/account'
import { ApiError } from '@/contracts/api-error'
import type { Cart } from '@/contracts/cart'
import { WalletInputSchema, type Wallet, type WalletInput, type WalletType } from '@/contracts/wallet'
import { CouponForm } from '@/features/cart/components/coupon-form'
import { emptyWalletValues, WalletFields, walletResolver, walletToValues, type WalletFormValues } from '@/features/wallets/components/wallet-form'
import { useWalletMutation } from '@/features/wallets/queries'
import { applyApiError } from '@/shared/lib/form-errors'
import { cn } from '@/shared/lib/utils'
import { formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { NftArtwork } from '@/shared/ui/nft-artwork'
import { Skeleton } from '@/shared/ui/skeleton'
import { checkoutDraft } from '../draft'
import { useCheckoutFlow, type OrderDetails } from '../use-checkout-flow'
import { CheckoutNotices } from './checkout-notices'
import { ProviderOptions } from './provider-options'
import { WalletApprovalDialog } from './wallet-approval-dialog'

const roundCheck =
  'size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border-2 border-primary checked:border-[5px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Figma "Desktop / Pagamento". Left: the receiving wallet as a form (the
 * primary wallet, or "Usar outra carteira?"), plus a note. Right: "Seus NFTs",
 * totals, "Carteira e rede" and "Confirmar compra". A new or edited wallet is
 * saved through the API before the order.
 */
export function DesktopCheckout({ user, cart, wallets }: { user: User; cart: Cart; wallets: Wallet[] }) {
  const draft = React.useMemo(() => checkoutDraft.load(user.id), [user.id])
  const primary = wallets.find((w) => w.slot === 'primary')
  const secondary = wallets.find((w) => w.slot === 'secondary')
  const [useOther, setUseOther] = React.useState(Boolean(draft.useOther && primary))
  const source = useOther ? secondary : primary
  const valuesOf = (wallet: Wallet | undefined) => (wallet ? walletToValues(wallet) : emptyWalletValues(user))

  const form = useForm<WalletFormValues, unknown, WalletInput>({ resolver: walletResolver, defaultValues: valuesOf(source) })
  const chosenNetwork = useWatch({ control: form.control, name: 'network' })
  const network = chosenNetwork || source?.network || 'ethereum'
  const [provider, setProvider] = React.useState<WalletType>(draft.provider ?? source?.walletType ?? 'metamask')
  const [note, setNote] = React.useState(draft.note ?? '')
  const [showCoupon, setShowCoupon] = React.useState(false)
  const flow = useCheckoutFlow({ userId: user.id, cartVersion: cart.version, network, provider })
  const walletMutation = useWalletMutation(user.id)
  const quote = flow.quote.data

  const switchSource = (other: boolean) => {
    setUseOther(other)
    checkoutDraft.update(user.id, { useOther: other })
    form.reset(valuesOf(other ? secondary : primary))
  }

  /** Validates the wallet form and saves it when it is new or was edited. */
  const collect = async (): Promise<OrderDetails | null> => {
    if (!(await form.trigger(undefined, { shouldFocus: true }))) return null
    const input = WalletInputSchema.parse(form.getValues())
    let walletId = source?.id
    try {
      if (!source) walletId = (await walletMutation.mutateAsync({ type: 'create', input })).wallet?.id
      else if (form.formState.isDirty) await walletMutation.mutateAsync({ type: 'update', id: source.id, input })
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        applyApiError(form, error)
        return null
      }
      throw error
    }
    if (!walletId) return null
    form.reset(form.getValues())
    return { walletId, buyer: { fullName: input.profileName, email: input.email }, note: note.trim() }
  }

  return (
    <div className="grid items-start gap-[33px] lg:grid-cols-[minmax(0,1fr)_405px]">
      <section aria-labelledby="collector-title" className="flex flex-col">
        <h2 id="collector-title" className="text-lg leading-6 font-bold">
          Perfil do colecionador
        </h2>
        <form
          id="checkout-form"
          noValidate
          className="mt-[18px] flex flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            void flow.confirm(collect)
          }}
        >
          <WalletFields form={form} density="compact" />
          <label className="mt-7 flex items-center gap-2.5 self-start text-base">
            <input type="checkbox" className={roundCheck} checked={useOther} disabled={!primary} onChange={(e) => switchSource(e.target.checked)} />
            Usar outra carteira?
          </label>
          {useOther && (
            <p className="mt-2 text-sm text-text-secondary">
              {secondary ? `Usando a carteira secundária "${secondary.displayName}".` : 'Preencha os dados da nova carteira: ela será salva como secundária.'}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2.5">
            <label htmlFor="collector-note" className="text-base leading-5">
              Observação do colecionador (opcional)
            </label>
            <textarea
              id="collector-note"
              value={note}
              maxLength={500}
              onChange={(e) => {
                setNote(e.target.value)
                checkoutDraft.update(user.id, { note: e.target.value })
              }}
              className="h-[150px] w-full max-w-[330px] resize-none rounded-md border border-border bg-transparent p-3 text-sm focus-visible:border-ring focus-visible:outline-none"
            />
          </div>
        </form>
      </section>

      <aside aria-labelledby="your-nfts-title" className="flex flex-col lg:sticky lg:top-6">
        <h2 id="your-nfts-title" className="text-lg leading-6 font-bold">
          Seus NFTs
        </h2>
        <div className="mt-2.5 flex justify-between border-b border-border pb-2.5 text-base font-bold">
          <span>NFTs</span>
          <span>Subtotal</span>
        </div>
        <ul className="mt-2.5 flex flex-col gap-2" aria-label="Itens do pedido">
          {cart.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-md bg-card p-1 pr-4">
              <NftArtwork image={item.nft.image} sizes="70px" className="size-[70px] shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold">{item.nft.name}</p>
                <p className="truncate text-sm text-text-secondary">ID do token: {item.nft.tokenId}</p>
              </div>
              <span className="shrink-0 text-sm text-text-secondary">(x {item.quantity})</span>
              <span className="shrink-0 text-lg font-bold text-text-accent">{formatEth(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-col items-center gap-2">
          {cart.couponCode || showCoupon ? (
            <div className="w-full">
              <CouponForm appliedCode={cart.couponCode} percentOff={quote?.coupon?.percentOff} />
            </div>
          ) : (
            <p className="text-[15px]">
              Tem um código promocional?{' '}
              <button type="button" className="hover:text-text-accent" onClick={() => setShowCoupon(true)}>
                Aplique aqui
              </button>
            </p>
          )}
        </div>

        <dl className={cn('mt-3 flex flex-col gap-2 transition-opacity', flow.quote.isFetching && 'opacity-60')} aria-busy={flow.quote.isFetching}>
          <Row label="Subtotal" value={quote && formatEth(quote.subtotal)} />
          <Row label={quote?.coupon ? `Desconto (${quote.coupon.code})` : 'Desconto do lançamento'} value={quote && `(-) ${formatEth(quote.discount, { unit: false })}`} />
          <Row label="Taxa de rede" value={quote && formatEth(quote.networkFee)} />
          <p className="text-center text-xs text-text-accent">Taxa estimada</p>
          <div className="mt-2 flex items-center justify-between border-t border-border px-10 pt-3 text-lg font-bold">
            <dt>Total</dt>
            <dd className="text-text-accent">{quote ? formatEth(quote.total) : <Skeleton className="h-5 w-28" />}</dd>
          </div>
        </dl>

        <h3 className="mt-2 text-center text-lg font-bold">Carteira e rede</h3>
        <div className="mt-5">
          <ProviderOptions
            layout="desktop"
            value={provider}
            onChange={(p) => {
              setProvider(p)
              checkoutDraft.update(user.id, { provider: p })
            }}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <CheckoutNotices flow={flow} />
          <Button type="submit" form="checkout-form" className="h-[42px] w-full text-base" disabled={!quote || flow.busy || flow.quoteChanged}>
            {flow.busy && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
            {flow.placing ? 'Enviando pedido…' : 'Confirmar compra'}
          </Button>
        </div>
      </aside>

      <WalletApprovalDialog flow={flow} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-base">{label}</dt>
      <dd className="text-lg">{value ?? <Skeleton className="h-5 w-20" />}</dd>
    </div>
  )
}
