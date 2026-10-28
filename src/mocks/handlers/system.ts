import { http, HttpResponse } from 'msw'

import type { Health } from '@/contracts/system'

export const systemHandlers = [
  http.get('*/api/health', () =>
    HttpResponse.json<Health>({ status: 'ok', scenario: 'default', serverTime: Date.now() }),
  ),
]
