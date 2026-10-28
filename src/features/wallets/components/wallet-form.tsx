import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { useForm } from 'react-hook-form'

import type { User } from '@/contracts/account'
import { CHAIN_LABELS, CHAINS } from '@/contracts/catalog'
import { WALLET_TYPE_LABELS, WALLET_TYPES, WalletInputSchema, type Wallet, type WalletInput } from '@/contracts/wallet'
import { applyApiError, FormError } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { SelectField } from '@/shared/ui/select-field'
import { TextField } from '@/shared/ui/text-field'
import { useWalletMutation } from '../queries'

const CHAIN_OPTIONS = CHAINS.map((value) => ({ value, label: CHAIN_LABELS[value] }))
const TYPE_OPTIONS = WALLET_TYPES.map((value) => ({ value, label: WALLET_TYPE_LABELS[value] }))

/** Random but valid 0x address: real wallets are out of scope. */
function testAddress() {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

function initialValues(user: User, wallet: Wallet | undefined, defaults: Partial<WalletInput>): WalletInput {
  if (wallet) {
    return {
      displayName: wallet.displayName,
      alias: wallet.alias,
      network: wallet.network,
      profileName: wallet.profileName,
      address: wallet.address,
      secondaryAddress: wallet.secondaryAddress ?? '',
      walletType: wallet.walletType,
      referralCode: wallet.referralCode ?? '',
      email: wallet.email,
      ensName: wallet.ensName,
    }
  }
  return {
    displayName: '',
    alias: '',
    network: 'ethereum',
    profileName: user.displayName,
    address: '',
    secondaryAddress: '',
    walletType: 'metamask',
    referralCode: '',
    email: user.email,
    ensName: user.ensName ?? user.username.replace(/[^a-z0-9-]/g, '-'),
    ...defaults,
  }
}

type Props = {
  user: User
  /** Edit this wallet; omit to create one. */
  wallet?: Wallet
  defaults?: Partial<WalletInput>
  onSaved: (wallet: Wallet) => void
  onCancel?: () => void
}

/** Fields of the Figma "Carteiras" frame. Saved only when the mock API answers. */
export function WalletForm({ user, wallet, defaults = {}, onSaved, onCancel }: Props) {
  const form = useForm<WalletInput>({
    resolver: zodResolver(WalletInputSchema),
    defaultValues: initialValues(user, wallet, defaults),
  })
  const mutation = useWalletMutation(user.id)
  const [formError, setFormError] = React.useState<string | null>(null)
  const { errors } = form.formState

  const submit = form.handleSubmit((input) => {
    setFormError(null)
    mutation.mutate(wallet ? { type: 'update', id: wallet.id, input } : { type: 'create', input }, {
      onSuccess: (response) => {
        if (response.wallet) onSaved(response.wallet)
      },
      onError: (error) => setFormError(applyApiError(form, error)),
    })
  })

  return (
    <form
      noValidate
      onSubmit={(e) => {
        // Rendered in a portal: keep the submit from reaching a parent form.
        e.stopPropagation()
        void submit(e)
      }}
      className="flex flex-col gap-5"
      aria-busy={mutation.isPending}
    >
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Nome de exibição" placeholder="Ex.: Principal" error={errors.displayName?.message} {...form.register('displayName')} />
        <TextField label="Apelido da carteira" placeholder="Ex.: Coleção" error={errors.alias?.message} {...form.register('alias')} />
        <SelectField label="Rede" options={CHAIN_OPTIONS} error={errors.network?.message} {...form.register('network')} />
        <SelectField label="Tipo de carteira" options={TYPE_OPTIONS} error={errors.walletType?.message} {...form.register('walletType')} />
        <TextField label="Nome do perfil" autoComplete="name" error={errors.profileName?.message} {...form.register('profileName')} />
        <TextField label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <TextField
            label="Endereço da carteira"
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
            error={errors.address?.message}
            {...form.register('address')}
          />
          <button
            type="button"
            onClick={() => form.setValue('address', testAddress(), { shouldValidate: true, shouldDirty: true })}
            className="self-start text-xs font-bold text-text-accent underline"
          >
            Usar endereço de teste (simulação)
          </button>
        </div>
        <TextField
          label="Endereço secundário ou ENS (opcional)"
          placeholder="0x… ou nome.eth"
          autoComplete="off"
          spellCheck={false}
          error={errors.secondaryAddress?.message}
          {...form.register('secondaryAddress')}
        />
        <TextField label="Nome ENS" autoComplete="off" error={errors.ensName?.message} {...form.register('ensName')} />
        <TextField
          label="Código de indicação (opcional)"
          autoComplete="off"
          error={errors.referralCode?.message}
          {...form.register('referralCode', { setValueAs: (v: string) => v.toUpperCase() })}
        />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          {wallet ? 'Salvar carteira' : 'Cadastrar carteira'}
        </Button>
      </div>
    </form>
  )
}
