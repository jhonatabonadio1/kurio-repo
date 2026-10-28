import { http, HttpResponse } from 'msw'
import { z } from 'zod'

import { getMockConfig, isScenario, setMockConfig, SCENARIOS } from '../config'
import { db } from '../db/store'
import { disconnectAllSockets, recentEvents, replayEvent } from '../realtime'
import { changeEditionPrice, changeEditionStock } from '../scenarios/price-change'

/**
 * Mock-only control routes (never part of the real API). Used by the dev
 * panel and by Playwright to pick a scenario and restore a known state.
 */
const ConfigBodySchema = z.object({
  scenario: z.string().refine(isScenario).optional(),
  latencyMs: z.number().int().min(0).nullable().optional(),
})

/** Events for tests and the dev panel; they go out through the mock Socket.IO server. */
const EmitBodySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('nft-price'), nftId: z.string(), editionId: z.string(), price: z.string().regex(/^\d+(\.\d+)?$/) }),
  z.object({ kind: z.literal('nft-stock'), nftId: z.string(), editionId: z.string(), available: z.number().int().min(0) }),
  /** Sends a recorded event again: the last one by default (a duplicate), or by index (an old one). */
  z.object({ kind: z.literal('replay'), index: z.number().int().optional() }),
  z.object({ kind: z.literal('disconnect') }),
])

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
  http.post('*/__mocks/emit', async ({ request }) => {
    const body = EmitBodySchema.safeParse(await request.json().catch(() => ({})))
    if (!body.success) return HttpResponse.json({ ok: false, error: body.error.issues[0]?.message }, { status: 400 })
    const cmd = body.data
    switch (cmd.kind) {
      case 'nft-price':
        return HttpResponse.json({ ok: true, event: changeEditionPrice(cmd.nftId, cmd.editionId, () => cmd.price) })
      case 'nft-stock':
        return HttpResponse.json({ ok: true, event: changeEditionStock(cmd.nftId, cmd.editionId, cmd.available) })
      case 'replay': {
        const entry = cmd.index === undefined ? recentEvents.at(-1) : recentEvents.at(cmd.index)
        if (!entry) return HttpResponse.json({ ok: false, error: 'No recorded event' }, { status: 404 })
        replayEvent(entry)
        return HttpResponse.json({ ok: true, event: entry.event })
      }
      case 'disconnect':
        disconnectAllSockets()
        return HttpResponse.json({ ok: true })
    }
  }),
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
