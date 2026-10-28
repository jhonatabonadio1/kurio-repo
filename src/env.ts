import { z } from 'zod'

const EnvSchema = z.object({
  VITE_API_MOCKING: z.enum(['enabled', 'disabled']).default('enabled'),
  VITE_API_URL: z.string().default('/api'),
  /** Empty = same origin as the page. */
  VITE_SOCKET_URL: z.string().default(''),
})

// `?? {}` and the window check let Node scripts import app modules.
const parsed = EnvSchema.parse(import.meta.env ?? {})

export const env = {
  apiMocking: parsed.VITE_API_MOCKING === 'enabled',
  apiUrl: parsed.VITE_API_URL,
  socketUrl: parsed.VITE_SOCKET_URL || (typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin),
} as const
