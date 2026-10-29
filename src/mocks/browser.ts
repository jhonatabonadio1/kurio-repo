import { setupWorker } from 'msw/browser'

import { env } from '@/env'
import { applyConfigFromUrl, setMockConfig } from './config'
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

/**
 * `?reset=1` restores the seed (mock DB) and clears the app's own storage
 * (session, guest cart token, checkout draft), then reloads without the
 * parameter. Combine with a scenario: `/?reset=1&scenario=slow`.
 */
function resetFromUrl(): boolean {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('reset')) return false
  db.reset()
  try {
    localStorage.removeItem('kurio-session')
    localStorage.removeItem('kurio-cart-token')
    sessionStorage.removeItem('kurio-checkout-draft')
  } catch {
    // Storage blocked: the mock DB reset still applies.
  }
  if (!url.searchParams.has('scenario')) setMockConfig({ scenario: 'default', latencyMs: null })
  url.searchParams.delete('reset')
  window.location.replace(url.href)
  return true
}

export async function startMockWorker() {
  // The page reloads right away; never resolve, so no request starts meanwhile.
  if (resetFromUrl()) return new Promise<never>(() => undefined)
  applyConfigFromUrl(window.location.search)
  await worker.start({
    quiet: true,
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  // Orders left pending before a refresh settle now (or when due).
  resumePendingOrders()
  // Demo panel (scenarios, reset, events); tests drive /__mocks/* instead.
  if (!navigator.webdriver) void import('./panel/scenario-panel').then((m) => m.mountScenarioPanel())
}
