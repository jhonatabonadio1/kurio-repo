import { delay, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'


import { getMockConfig, onMockConfigChange, type Scenario } from './config'
import { createRandom } from './lib/random'
import { errors } from './lib/http'

/**
 * Wraps a REST resolver with the network conditions of the active scenario.
 * Business scenarios (expired coupon, sold out, payment result...) are
 * handled inside the resolvers; this layer only simulates the network.
 */
export type RouteOptions = {
  /** Scenarios in which this route answers 500 (e.g. server-error on the catalog). */
  failOn?: Scenario[]
}

const OUT_OF_ORDER_SLOW_MS = 1_600
const OUT_OF_ORDER_FAST_MS = 150
const SLOW_MS = 2_500

let latencyRandom = createRandom(7)
const flakyFailed = new Set<string>()
const routeCalls = new Map<string, number>()

// A new scenario starts from a clean, repeatable state.
onMockConfigChange(() => {
  latencyRandom = createRandom(7)
  flakyFailed.clear()
  routeCalls.clear()
})

function latencyFor(route: string): number {
  const { scenario, latencyMs } = getMockConfig()
  if (scenario === 'slow') return SLOW_MS
  if (scenario === 'out-of-order' && route === 'nfts.list') {
    // 1st, 3rd, 5th... requests are slow, the next ones fast: answers arrive out of order.
    const n = routeCalls.get(route) ?? 0
    return n % 2 === 1 ? OUT_OF_ORDER_SLOW_MS : OUT_OF_ORDER_FAST_MS
  }
  if (latencyMs !== null) return latencyMs
  return latencyRandom.int(150, 400)
}

type Resolver<Params extends PathParams> = HttpResponseResolver<Params, DefaultBodyType, DefaultBodyType>

export function withNetwork<Params extends PathParams = PathParams>(
  route: string,
  resolver: Resolver<Params>,
  options: RouteOptions = {},
): Resolver<Params> {
  return async (info) => {
    const { scenario } = getMockConfig()
    routeCalls.set(route, (routeCalls.get(route) ?? 0) + 1)

    if (scenario === 'offline') return HttpResponse.error()

    const ms = latencyFor(route)
    if (ms > 0) await delay(ms)

    if (scenario === 'flaky' && !flakyFailed.has(route)) {
      flakyFailed.add(route)
      return errors.unavailable()
    }
    if (options.failOn?.includes(scenario)) return errors.server()

    return resolver(info)
  }
}

/** Never answers: the client's own timeout fires (order-timeout scenario). */
export const hang = () => delay('infinite')
