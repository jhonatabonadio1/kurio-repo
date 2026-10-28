import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'

/**
 * Mock Socket.IO server, built on MSW `ws.link` + `@mswjs/socket.io-binding`.
 *
 * Transport: WebSocket only. The client must use `transports: ['websocket']`;
 * HTTP long-polling (Socket.IO's default first step) is not covered by the binding.
 *
 * Limitations of the binding, handled here:
 * - It fakes the Engine.IO handshake with pingInterval 25000 / pingTimeout 5000,
 *   but never sends pings. A real socket.io-client then closes with
 *   "ping timeout" after ~30 s. We send the Engine.IO ping packet ("2") ourselves.
 * - No rooms, namespaces (only "/"), broadcast or acknowledgements. The registry
 *   below keeps every open connection so events can be sent to all of them
 *   or only to one user's connections.
 *
 * This file has no app imports so it runs both in the browser worker setup
 * and in the Node check (`pnpm verify:socket`).
 */

/** Must match the interval the binding announces in its handshake. */
export const ENGINE_IO_PING_INTERVAL_MS = 25_000
const ENGINE_IO_PING_PACKET = '2'

type BoundSocket = ReturnType<typeof toSocketIo>

export type MockSocketConnection = {
  id: string
  io: BoundSocket
  /** Set after the client authenticates with `session.auth`. */
  userId: string | null
  close: () => void
}

export type MockSocketServer = {
  handler: ReturnType<ReturnType<typeof ws.link>['addEventListener']>
  /** Send an event to every open connection. */
  broadcast: (event: string, payload: unknown) => void
  /** Send an event only to connections authenticated as this user. */
  emitToUser: (userId: string, event: string, payload: unknown) => void
  /** Close every connection, e.g. on mock reset or a "disconnect" scenario. */
  disconnectAll: () => void
  connections: () => ReadonlyArray<MockSocketConnection>
}

export type CreateMockSocketServerOptions = {
  /** HTTP(S) origin the app connects to, e.g. `http://localhost:5173`. */
  origin: string
  /** Maps a session token to a user id; return null for an invalid token. */
  resolveToken?: (token: string) => string | null
  pingIntervalMs?: number
}

let nextConnectionId = 1

export function createMockSocketServer(options: CreateMockSocketServerOptions): MockSocketServer {
  const { pingIntervalMs = ENGINE_IO_PING_INTERVAL_MS } = options
  const wsOrigin = options.origin.replace(/^http/, 'ws').replace(/\/$/, '')
  // MSW rewrites a client path of `/socket.io/` to `/` before matching
  // (WebSocketHandler.parse), and ignores the `?EIO=4&transport=websocket`
  // query. So the link is the bare origin: `ws://host/` matches the default
  // Socket.IO path. Keep the client on the default path.
  const link = ws.link(`${wsOrigin}/`)
  const registry = new Map<string, MockSocketConnection>()

  const handler = link.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    const id = `mock-conn-${nextConnectionId++}`

    const heartbeat = setInterval(() => {
      connection.client.send(ENGINE_IO_PING_PACKET)
    }, pingIntervalMs)

    const entry: MockSocketConnection = {
      id,
      io,
      userId: null,
      close: () => connection.client.close(),
    }
    registry.set(id, entry)

    connection.client.addEventListener('close', () => {
      clearInterval(heartbeat)
      registry.delete(id)
    })

    // Spike / health check: proves events travel both ways.
    io.client.on('system.hello', (_event, payload: { sentAt: number }) => {
      io.client.emit('system.welcome', {
        connectionId: id,
        echoedSentAt: payload?.sentAt ?? null,
        serverTime: Date.now(),
      })
    })

    // Bind this connection to a user, so private events reach only them.
    io.client.on('session.auth', (_event, payload: { token?: string }) => {
      const userId = payload?.token && options.resolveToken ? options.resolveToken(payload.token) : null
      entry.userId = userId
      if (userId) {
        io.client.emit('session.ready', { userId })
      } else {
        io.client.emit('session.rejected', { reason: 'INVALID_TOKEN' })
      }
    })
  })

  return {
    handler,
    broadcast(event, payload) {
      for (const conn of registry.values()) conn.io.client.emit(event, payload)
    },
    emitToUser(userId, event, payload) {
      for (const conn of registry.values()) {
        if (conn.userId === userId) conn.io.client.emit(event, payload)
      }
    },
    disconnectAll() {
      for (const conn of registry.values()) conn.close()
    },
    connections: () => [...registry.values()],
  }
}
