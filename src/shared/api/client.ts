import axios, { AxiosError } from 'axios'
import type { z } from 'zod'

import { ApiError, ApiErrorBodySchema } from '@/contracts/api-error'
import { env } from '@/env'

/** The only HTTP client. Every REST call goes through it (and through MSW in mock mode). */
export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// Every failure leaves as ApiError, so queries and forms handle one shape.
http.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isCancel(error)) return Promise.reject(error)
  if (error instanceof AxiosError) {
    if (error.response) {
      const body = ApiErrorBodySchema.safeParse(error.response.data)
      return Promise.reject(
        new ApiError(
          error.response.status,
          body.success
            ? body.data.error
            : {
                code: 'UNEXPECTED_RESPONSE',
                message: 'Resposta inesperada do servidor.',
                retryable: error.response.status >= 500,
              },
        ),
      )
    }
    const timedOut = error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT
    return Promise.reject(
      new ApiError(0, {
        code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: timedOut ? 'O servidor demorou para responder.' : 'Sem conexão com o servidor.',
        retryable: true,
      }),
    )
  }
  return Promise.reject(error)
})

/** GET + runtime validation against the contract. */
export async function getParsed<T extends z.ZodType>(
  url: string,
  schema: T,
  config?: Parameters<typeof http.get>[1],
): Promise<z.infer<T>> {
  const { data } = await http.get<unknown>(url, config)
  return schema.parse(data)
}
