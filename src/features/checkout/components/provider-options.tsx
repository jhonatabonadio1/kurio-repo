import { WALLET_TYPE_LABELS, type WalletType } from '@/contracts/wallet'
import { cn } from '@/shared/lib/utils'

const ORDER: WalletType[] = ['walletconnect', 'metamask', 'coinbase']
const MARKS: Record<WalletType, string> = { walletconnect: 'W', metamask: 'M', coinbase: 'C' }

const ring = (checked: boolean) => (
  <span aria-hidden className={cn('grid size-[18px] shrink-0 place-items-center rounded-full border-2 border-primary', checked && 'border-[5px]')} />
)

/** "Carteira e rede": the app that signs the payment. Desktop rows (radio left) or mobile cards (radio right). */
export function ProviderOptions({ value, onChange, layout }: { value: WalletType; onChange: (provider: WalletType) => void; layout: 'desktop' | 'mobile' }) {
  return (
    <div role="radiogroup" aria-label="Carteira para assinar o pagamento" className={cn('flex flex-col', layout === 'desktop' ? 'gap-4' : 'gap-3')}>
      {ORDER.map((type) => {
        const checked = type === value
        return (
          <label
            key={type}
            className={cn(
              'flex cursor-pointer items-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
              layout === 'desktop'
                ? cn('h-[45px] gap-3 rounded-md border px-3', checked ? 'border-primary' : 'border-border hover:border-border-soft')
                : cn('h-[50px] gap-3 rounded-lg border bg-card px-3', checked ? 'border-primary' : 'border-transparent'),
            )}
          >
            <input type="radio" name="provider" value={type} checked={checked} onChange={() => onChange(type)} className="sr-only" />
            {layout === 'desktop' ? (
              <>
                {ring(checked)}
                {type === 'walletconnect' ? (
                  // Figma shows the "compatible wallets" badge for WalletConnect.
                  <span className="rounded border border-border-soft bg-surface-dark px-2 py-1.5 text-[9px] font-bold tracking-wide text-text-accent uppercase">
                    <span className="sr-only">WalletConnect: </span>MetaMask · WalletConnect · Coinbase
                  </span>
                ) : (
                  <span className="text-base">{WALLET_TYPE_LABELS[type]}</span>
                )}
              </>
            ) : (
              <>
                <span aria-hidden className="grid size-[30px] shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-text-accent">
                  {MARKS[type]}
                </span>
                <span className="flex-1 text-sm">{WALLET_TYPE_LABELS[type]}</span>
                {ring(checked)}
              </>
            )}
          </label>
        )
      })}
    </div>
  )
}
