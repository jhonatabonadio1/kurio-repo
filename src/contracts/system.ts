import { z } from 'zod'

export const HealthSchema = z.object({
  status: z.literal('ok'),
  scenario: z.string(),
  serverTime: z.number(),
})
export type Health = z.infer<typeof HealthSchema>

/** Socket handshake check: client emits `system.hello`, server answers `system.welcome`. */
export const SystemWelcomeSchema = z.object({
  connectionId: z.string(),
  echoedSentAt: z.number().nullable(),
  serverTime: z.number(),
})
export type SystemWelcome = z.infer<typeof SystemWelcomeSchema>
