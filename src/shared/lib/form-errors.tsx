import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

import { ApiError } from '@/contracts/api-error'

/** API errors -> field errors (422/409) or a form-level message; focuses the first bad field. */
export function applyApiError<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): string | null {
  if (error instanceof ApiError && error.fields) {
    const entries = Object.entries(error.fields)
    for (const [field, message] of entries) form.setError(field as Path<T>, { type: 'server', message })
    if (entries[0]) form.setFocus(entries[0][0] as Path<T>)
    return null
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.'
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}
