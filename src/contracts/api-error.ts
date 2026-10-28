import { z } from 'zod'

/** One error shape for every failed response (see ARCHITECTURE.md › Contracts). */
export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    /** 422 only: field name -> message, mapped to form errors. */
    fields: z.record(z.string(), z.string()).optional(),
    /** True for timeouts, 503 and network loss. */
    retryable: z.boolean(),
  }),
})
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  readonly retryable: boolean

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.fields = body.fields
    this.retryable = body.retryable
  }
}
