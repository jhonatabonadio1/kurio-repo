/**
 * Proves the mock real-time stack works with a real socket.io-client:
 *   socket.io-client -> MSW ws.link -> @mswjs/socket.io-binding -> mock server
 *
 * Run: pnpm verify:socket   (~35 s, because it waits past the 30 s ping timeout)
 *
 * In Node, socket.io-client defaults to the `ws` package, which MSW does not
 * intercept. Passing engine.io-client's `WebSocket` transport makes it use the
 * global WebSocket, the same path the browser build takes.
 *
 * engine.io-client copies `globalThis.WebSocket` into a constant when its
 * module is first evaluated. So socket.io-client / engine.io-client are
 * imported dynamically AFTER `server.listen()` patches WebSocket — the same
 * ordering rule the app follows (see src/shared/realtime/socket.ts).
 */
import { setupServer } from 'msw/node'
import type { Socket } from 'socket.io-client'

import { createMockSocketServer } from '../src/mocks/socket/socket-handler.ts'

const ORIGIN = 'http://localhost:5173'
const HOLD_MS = 33_000 // binding announces pingInterval 25 s + pingTimeout 5 s

const withHeartbeat = createMockSocketServer({
  origin: ORIGIN,
  resolveToken: (token) => (token === 'token-alice' ? 'alice' : token === 'token-bruno' ? 'bruno' : null),
})
// Control group on another origin: the binding as-is, without our heartbeat.
const NO_PING_ORIGIN = 'http://localhost:5174'
const withoutHeartbeat = createMockSocketServer({
  origin: NO_PING_ORIGIN,
  pingIntervalMs: 10 * 60_000, // effectively never
})

const server = setupServer(withHeartbeat.handler, withoutHeartbeat.handler)
server.listen({ onUnhandledRequest: 'bypass' })

// Only now, with WebSocket patched by MSW:
const { io } = await import('socket.io-client')
const { WebSocket: NativeWebSocketTransport } = await import('engine.io-client')

const results: Array<{ name: string; ok: boolean; detail: string }> = []
const check = (name: string, ok: boolean, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const connect = (origin = ORIGIN) =>
  io(origin, {
    transports: [NativeWebSocketTransport],
    reconnection: false,
  })

const once = <T>(socket: Socket, event: string, timeoutMs = 3000) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), timeoutMs)
    socket.once(event, (payload: T) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })

async function main() {
  // 1. Handshake + event both ways
  const alice = connect()
  await once(alice, 'connect')
  check('client connects through MSW', alice.connected)

  const sentAt = Date.now()
  alice.emit('system.hello', { sentAt })
  const welcome = await once<{ echoedSentAt: number; connectionId: string }>(alice, 'system.welcome')
  check('client -> server -> client round trip', welcome.echoedSentAt === sentAt, `connection ${welcome.connectionId}`)

  // 2. Per-user routing (the binding has no rooms)
  const bruno = connect()
  await once(bruno, 'connect')
  alice.emit('session.auth', { token: 'token-alice' })
  bruno.emit('session.auth', { token: 'token-bruno' })
  await Promise.all([once(alice, 'session.ready'), once(bruno, 'session.ready')])

  const aliceGot: unknown[] = []
  const brunoGot: unknown[] = []
  alice.on('order.updated', (p) => aliceGot.push(p))
  bruno.on('order.updated', (p) => brunoGot.push(p))
  withHeartbeat.emitToUser('alice', 'order.updated', { orderId: 'o-1', status: 'confirmed' })
  await new Promise((r) => setTimeout(r, 200))
  check('private event reaches only its owner', aliceGot.length === 1 && brunoGot.length === 0)

  const intruder = connect()
  await once(intruder, 'connect')
  intruder.emit('session.auth', { token: 'stolen' })
  await once(intruder, 'session.rejected')
  check('invalid token is rejected', true)
  intruder.disconnect()

  const broadcastsSeen = { alice: 0, bruno: 0 }
  alice.on('nft.updated', () => broadcastsSeen.alice++)
  bruno.on('nft.updated', () => broadcastsSeen.bruno++)
  withHeartbeat.broadcast('nft.updated', { nftId: 'nft-1', version: 2 })
  await new Promise((r) => setTimeout(r, 200))
  check('public event reaches everyone', broadcastsSeen.alice === 1 && broadcastsSeen.bruno === 1)
  bruno.disconnect()

  // 3. Heartbeat: hold both sockets past the 30 s ping timeout
  const unprotected = connect(NO_PING_ORIGIN)
  await once(unprotected, 'connect')
  const reasons: Record<string, string | null> = { alice: null, unprotected: null }
  alice.on('disconnect', (reason) => (reasons.alice = reason))
  unprotected.on('disconnect', (reason) => (reasons.unprotected = reason))

  console.log(`...holding connections for ${HOLD_MS / 1000}s to cross the ping timeout`)
  await new Promise((r) => setTimeout(r, HOLD_MS))

  check('with mock heartbeat: still connected after 33 s', alice.connected && reasons.alice === null)
  check(
    'without heartbeat: dropped by "ping timeout" (binding limitation)',
    reasons.unprotected === 'ping timeout',
    `reason=${reasons.unprotected}`,
  )

  alice.disconnect()
  unprotected.disconnect()
}

main()
  .catch((error) => check('unexpected error', false, String(error)))
  .finally(() => {
    server.close()
    const failed = results.filter((r) => !r.ok)
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
    process.exit(failed.length ? 1 : 0)
  })
