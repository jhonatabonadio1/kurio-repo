import type { User } from '@/contracts/account'
import type { Wallet } from '@/contracts/wallet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { WalletForm, type WalletFormValues } from './wallet-form'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  wallet?: Wallet
  defaults?: Partial<WalletFormValues>
  onSaved: (wallet: Wallet) => void
}

export function WalletFormDialog({ open, onOpenChange, user, wallet, defaults, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader className="text-left">
          <DialogTitle>{wallet ? 'Editar carteira' : 'Cadastrar carteira'}</DialogTitle>
          <DialogDescription>
            A carteira recebe os NFTs comprados. A primeira cadastrada vira a principal.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every opening starts from fresh values. */}
        {open && (
          <WalletForm
            user={user}
            wallet={wallet}
            defaults={defaults}
            density="compact"
            onSaved={(saved) => {
              onSaved(saved)
              onOpenChange(false)
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
