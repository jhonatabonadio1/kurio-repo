import type { Socket } from 'socket.io-client'

import { env } from '@/env'

/**
 * Creates the app's Socket.IO client.
 *
 * `socket.io-client` is imported dynamically ON PURPOSE. engine.io-client saves
 * `globalThis.WebSocket` into a constant when its module is first evaluated.
 * If it were imported statically, it would run before MSW patches WebSocket
 * and the socket would bypass the mocks. Loading it here, after boot, also
 * keeps it out of the first JS chunk. ESLint blocks static imports elsewhere.
 */
export async function createSocket(): Promise<Socket> {
  const { io } = await import('socket.io-client')
  return io(env.socketUrl, {
    // The MSW Socket.IO binding only supports the WebSocket transport.
    transports: ['websocket'],
    autoConnect: false,
    // One Manager per socket: a new session never shares listeners with the old one.
    forceNew: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
  })
}
