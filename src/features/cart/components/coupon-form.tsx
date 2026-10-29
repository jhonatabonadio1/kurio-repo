import { TicketPercent, X } from 'lucide-react'
import * as React from 'react'

import { ApiError } from '@/contracts/api-error'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/ui/toaster'
import { useApplyCoupon, useRemoveCoupon } from '../mutations'

/** Figma "Promo Code": input with "Aplicar"; an applied code shows with "Remover". */
export function CouponForm({
  appliedCode,
  percentOff,
  variant = 'outline',
}: {
  appliedCode: string | null
  percentOff?: number
  /** outline: desktop (orange border, attached button). pill: mobile sheet (rounded, button inside). */
  variant?: 'outline' | 'pill'
}) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const inputId = React.useId()

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-success/40 bg-success/5 px-3 py-2.5 text-sm">
        <span className="flex items-center gap-2">
          <TicketPercent className="size-4 text-success" aria-hidden />
          Cupom <strong>{appliedCode}</strong> aplicado{percentOff ? ` (−${percentOff}%)` : ''}
        </span>
        <button
          type="button"
          onClick={() => remove.mutate(undefined, { onSuccess: () => toast('Cupom removido.') })}
          disabled={remove.isPending}
          className="flex items-center gap-1 text-text-secondary hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
          Remover
        </button>
      </div>
    )
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!code.trim()) {
      setError('Digite um código promocional.')
      return
    }
    apply.mutate(code.trim(), {
      onSuccess: (cart) => {
        setCode('')
        toast(`Cupom ${cart.couponCode} aplicado.`, 'success')
      },
      onError: (e) =>
        setError(e instanceof ApiError ? (e.fields?.couponCode ?? e.message) : 'Não foi possível aplicar o cupom.'),
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <label htmlFor={inputId} className={cn('text-base leading-4 font-bold', variant === 'pill' && 'sr-only')}>
        Código promocional
      </label>
      <div
        className={cn(
          'flex overflow-hidden',
          variant === 'outline' ? 'h-10 rounded-md border border-primary' : 'h-[42px] rounded-full bg-surface-dark/50 p-1',
          error && 'border-destructive ring-1 ring-destructive',
        )}
      >
        <input
          id={inputId}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Digite o código promocional..."
          autoComplete="off"
          maxLength={20}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm uppercase placeholder:normal-case placeholder:text-brand-secondary focus:outline-none"
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className={cn(
            'shrink-0 bg-primary text-sm font-bold text-ink transition-colors hover:bg-text-accent disabled:opacity-60',
            variant === 'outline' ? 'w-[102px]' : 'w-[78px] rounded-full',
          )}
        >
          {apply.isPending ? '…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
