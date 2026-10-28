import { HttpResponse } from 'msw'

import type { ApiErrorBody } from '@/contracts/api-error'

/** Every mock error uses the shared error contract. */
export function apiError(
  status: number,
  code: string,
  message: string,
  extra: { fields?: Record<string, string>; retryable?: boolean } = {},
) {
  return HttpResponse.json<ApiErrorBody>(
    { error: { code, message, fields: extra.fields, retryable: extra.retryable ?? status >= 500 } },
    { status },
  )
}

export const errors = {
  validation: (fields: Record<string, string>, message = 'Verifique os campos destacados.') =>
    apiError(422, 'VALIDATION_ERROR', message, { fields }),
  badRequest: (message: string) => apiError(400, 'BAD_REQUEST', message),
  unauthorized: (code = 'UNAUTHENTICATED', message = 'Entre na sua conta para continuar.') =>
    apiError(401, code, message),
  forbidden: () => apiError(403, 'FORBIDDEN', 'Você não tem acesso a este recurso.'),
  notFound: (code: string, message: string) => apiError(404, code, message),
  conflict: (code: string, message: string, fields?: Record<string, string>) =>
    apiError(409, code, message, { fields }),
  server: () => apiError(500, 'INTERNAL_ERROR', 'Erro inesperado no servidor. Tente novamente.', { retryable: true }),
  unavailable: () =>
    apiError(503, 'SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível.', { retryable: true }),
}
