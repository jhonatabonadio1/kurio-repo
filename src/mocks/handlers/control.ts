import { http, HttpResponse } from 'msw'
import { z } from 'zod'

import { getMockConfig, isScenario, setMockConfig, SCENARIOS } from '../config'
import { db } from '../db/store'

/**
 * Mock-only control routes (never part of the real API). Used by the dev
 * panel and by Playwright to pick a scenario and restore a known state.
 */
const ConfigBodySchema = z.object({
  scenario: z.string().refine(isScenario).optional(),
  latencyMs: z.number().int().min(0).nullable().optional(),
})

export const controlHandlers = [
  http.get('*/__mocks/state', () =>
    HttpResponse.json({
      config: getMockConfig(),
      scenarios: SCENARIOS,
      counts: db.read((s) => ({
        orders: Object.keys(s.orders).length,
        sessions: s.sessions.length,
        carts: Object.keys(s.carts).length,
      })),
    }),
  ),
  http.post('*/__mocks/reset', () => {
    db.reset()
    return HttpResponse.json({ ok: true, config: getMockConfig() })
  }),
  http.post('*/__mocks/config', async ({ request }) => {
    const body = ConfigBodySchema.safeParse(await request.json().catch(() => ({})))
    if (!body.success) return HttpResponse.json({ ok: false }, { status: 400 })
    const { scenario, latencyMs } = body.data
    setMockConfig({
      ...(scenario && isScenario(scenario) ? { scenario } : {}),
      ...(latencyMs !== undefined ? { latencyMs } : {}),
    })
    return HttpResponse.json({ ok: true, config: getMockConfig() })
  }),
]
