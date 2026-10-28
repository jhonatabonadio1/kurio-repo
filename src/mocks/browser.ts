import { setupWorker } from 'msw/browser'

import { env } from '@/env'
import { applyConfigFromUrl } from './config'
import { db } from './db/store'
import { restHandlers } from './handlers'
import { resumePendingOrders } from './lib/orders'
import { attachRealtimeServer } from './realtime'
import { createMockSocketServer } from './socket/socket-handler'

export const mockSocketServer = createMockSocketServer({
  origin: env.socketUrl,
  resolveToken: (token) =>
    db.read((s) => {
      const session = s.sessions.find((x) => x.token === token)
      return session && Date.parse(session.expiresAt) > Date.now() ? session.userId : null
    }),
})

attachRealtimeServer(mockSocketServer)

// A reset drops every socket; clients reconnect and reconcile with REST.
db.onReset(() => mockSocketServer.disconnectAll())

export const worker = setupWorker(...restHandlers, mockSocketServer.handler)

export async function startMockWorker() {
  applyConfigFromUrl(window.location.search)
  await worker.start({
    quiet: true,
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  // Orders left pending before a refresh settle now (or when due).
  resumePendingOrders()
}
