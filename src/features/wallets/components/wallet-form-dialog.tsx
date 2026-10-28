import type { User } from '@/contracts/account'
import type { Wallet, WalletInput } from '@/contracts/wallet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { WalletForm } from './wallet-form'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  wallet?: Wallet
  defaults?: Partial<WalletInput>
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
