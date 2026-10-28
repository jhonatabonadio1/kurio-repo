import { http, HttpResponse } from 'msw'

import type { Health } from '@/contracts/system'
import { getMockConfig } from '../config'
import { withNetwork } from '../network'

export const systemHandlers = [
  http.get(
    '*/api/health',
    withNetwork('health', () =>
      HttpResponse.json<Health>({ status: 'ok', scenario: getMockConfig().scenario, serverTime: Date.now() }),
    ),
  ),
]
