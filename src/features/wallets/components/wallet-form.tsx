import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form'

import type { User } from '@/contracts/account'
import { CHAIN_LABELS, CHAINS, type Chain } from '@/contracts/catalog'
import { WALLET_TYPE_LABELS, WALLET_TYPES, WalletInputSchema, type Wallet, type WalletInput, type WalletType } from '@/contracts/wallet'
import { applyApiError, FormError } from '@/shared/lib/form-errors'
import { cn } from '@/shared/lib/utils'
import { Button, mobilePill } from '@/shared/ui/button'
import { EnsField } from '@/shared/ui/ens-field'
import type { FieldVariant } from '@/shared/ui/field'
import { SelectField } from '@/shared/ui/select-field'
import { TextField } from '@/shared/ui/text-field'
import { useWalletMutation } from '../queries'

const CHAIN_OPTIONS = CHAINS.map((value) => ({ value, label: CHAIN_LABELS[value] }))
const TYPE_OPTIONS = WALLET_TYPES.map((value) => ({ value, label: WALLET_TYPE_LABELS[value] }))

/** Selects start empty ("Selecione uma rede"), as in the Figma. */
export type WalletFormValues = Omit<WalletInput, 'network' | 'walletType'> & { network: Chain | ''; walletType: WalletType | '' }
export const walletResolver = zodResolver(WalletInputSchema) as unknown as Resolver<WalletFormValues, unknown, WalletInput>

/** Random but valid 0x address: real wallets are out of scope. */
function testAddress() {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

export function walletToValues(wallet: Wallet): WalletFormValues {
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

export function emptyWalletValues(user: User, defaults: Partial<WalletFormValues> = {}): WalletFormValues {
  return {
    displayName: '',
    alias: '',
    network: '',
    profileName: user.displayName,
    address: '',
    secondaryAddress: '',
    walletType: '',
    referralCode: '',
    email: user.email,
    ensName: user.ensName ?? user.username.replace(/[^a-z0-9-]/g, '-'),
    ...defaults,
  }
}


type FieldsProps = {
  form: UseFormReturn<WalletFormValues, unknown, WalletInput>
  variant?: FieldVariant
  density?: 'page' | 'compact'
}

/** The ten fields of the Figma wallet form, in its order (Carteiras page and desktop checkout). */
export function WalletFields({ form, variant = 'outline', density = 'page' }: FieldsProps) {
  const { errors } = form.formState
  const field = 'gap-1'
  return (
    <div className={cn('grid sm:grid-cols-2', density === 'page' ? 'gap-x-[29px] gap-y-7' : 'gap-x-6 gap-y-4')}>
      <TextField variant={variant} className={field} requiredMark label="Nome de exibição" error={errors.displayName?.message} {...form.register('displayName')} />
      <TextField variant={variant} className={field} requiredMark label="Apelido da carteira" error={errors.alias?.message} {...form.register('alias')} />
      <SelectField variant={variant} className={field} requiredMark label="Rede" placeholder="Selecione uma rede" options={CHAIN_OPTIONS} error={errors.network?.message} {...form.register('network')} />
      <TextField variant={variant} className={field} requiredMark label="Nome do perfil" autoComplete="name" error={errors.profileName?.message} {...form.register('profileName')} />
      {/* The test-address link sits in the row gap, so the grid keeps the Figma rhythm. */}
      <div className="relative">
        <TextField
          variant={variant}
          className={field}
          requiredMark
          label="Endereço da carteira"
          placeholder="Endereço 0x da carteira"
          autoComplete="off"
          spellCheck={false}
          error={errors.address?.message}
          {...form.register('address')}
        />
        <button
          type="button"
          onClick={() => form.setValue('address', testAddress(), { shouldValidate: true, shouldDirty: true })}
          className="absolute top-full left-0 mt-0.5 text-xs text-text-accent underline"
        >
          Usar endereço de teste (simulação)
        </button>
      </div>
      {/* No visible label in the Figma; the placeholder names it, the label stays for screen readers. */}
      <TextField
        variant={variant}
        className={cn(field, 'sm:mt-6')}
        hideLabel
        label="ENS ou carteira secundária (opcional)"
        placeholder="ENS ou carteira secundária (opcional)"
        autoComplete="off"
        spellCheck={false}
        error={errors.secondaryAddress?.message}
        {...form.register('secondaryAddress')}
      />
      <SelectField
        variant={variant}
        className={field}
        requiredMark
        label="Tipo de carteira"
        placeholder="Selecione uma carteira"
        options={TYPE_OPTIONS}
        error={errors.walletType?.message}
        {...form.register('walletType')}
      />
      <TextField
        variant={variant}
        className={field}
        requiredMark
        label="Código de indicação"
        autoComplete="off"
        error={errors.referralCode?.message}
        {...form.register('referralCode', { setValueAs: (v: string) => v.toUpperCase() })}
      />
      <TextField variant={variant} className={field} requiredMark label="E-mail" type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
      <EnsField variant={variant} className={field} requiredMark error={errors.ensName?.message} {...form.register('ensName')} />
    </div>
  )
}

type Props = {
  user: User
  /** Edit this wallet; omit to create one. */
  wallet?: Wallet
  defaults?: Partial<WalletFormValues>
  onSaved: (wallet: Wallet) => void
  onCancel?: () => void
  variant?: FieldVariant
  /** Row spacing: "page" (Carteiras frame) or "compact" (dialog). */
  density?: 'page' | 'compact'
  submitLabel?: string
}

/** Fields of the Figma "Carteiras" frame, in its order. Saved only when the mock API answers. */
export function WalletForm({ user, wallet, defaults, onSaved, onCancel, variant = 'outline', density = 'page', submitLabel = 'Salvar carteira' }: Props) {
  const form = useForm<WalletFormValues, unknown, WalletInput>({
    resolver: walletResolver,
    defaultValues: wallet ? walletToValues(wallet) : emptyWalletValues(user, defaults),
  })
  const mutation = useWalletMutation(user.id)
  const [formError, setFormError] = React.useState<string | null>(null)

  const submit = form.handleSubmit((input) => {
    setFormError(null)
    mutation.mutate(wallet ? { type: 'update', id: wallet.id, input } : { type: 'create', input }, {
      onSuccess: (response) => {
        if (response.wallet) {
          form.reset(walletToValues(response.wallet))
          onSaved(response.wallet)
        }
      },
      onError: (error) => setFormError(applyApiError(form, error)),
    })
  })

  return (
    <form
      noValidate
      onSubmit={(e) => {
        // May render in a portal (dialog): keep the submit from reaching a parent form.
        e.stopPropagation()
        void submit(e)
      }}
      className="flex flex-col gap-8"
      aria-busy={mutation.isPending}
    >
      <FormError message={formError} />
      <WalletFields form={form} variant={variant} density={density} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={mutation.isPending} className={cn(density === 'page' && mobilePill)}>
          {mutation.isPending && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
