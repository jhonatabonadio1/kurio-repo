import { setupWorker } from 'msw/browser'

import { env } from '@/env'
import { systemHandlers } from './handlers/system'
import { createMockSocketServer } from './socket/socket-handler'

export const mockSocketServer = createMockSocketServer({
  origin: env.socketUrl,
  // Filled in when the session mock lands (day 2).
  resolveToken: () => null,
})

export const worker = setupWorker(...systemHandlers, mockSocketServer.handler)

export async function startMockWorker() {
  await worker.start({
    quiet: true,
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}
