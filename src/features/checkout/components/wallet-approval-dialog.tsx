import { CHAIN_LABELS } from '@/contracts/catalog'
import { WALLET_TYPE_LABELS } from '@/contracts/wallet'
import { formatEth } from '@/shared/money/eth'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import type { CheckoutFlow } from '../use-checkout-flow'

/**
 * Stand-in for the wallet extension (real extensions are out of scope):
 * the user approves or refuses, as MetaMask would. Closing = refusing.
 */
export function WalletApprovalDialog({ flow }: { flow: CheckoutFlow }) {
  const pending = flow.approval
  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && pending && flow.refuse()}>
      <DialogContent>
        {pending && (
          <>
            <DialogHeader>
              <DialogTitle>{WALLET_TYPE_LABELS[pending.provider]} (simulação)</DialogTitle>
              <DialogDescription>
                A Kurio pede a aprovação de um pagamento de <strong className="text-foreground">{formatEth(pending.quote.total)}</strong> na rede{' '}
                {CHAIN_LABELS[pending.network]}. Extensões reais estão fora do escopo: escolha como a carteira responde.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={flow.refuse}>
                Recusar
              </Button>
              <Button onClick={flow.approve}>Aprovar pagamento</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
