import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'

import { REALTIME_EVENTS } from '@/contracts/realtime'
import { sessionStore } from '@/shared/auth/session-store'
import { createSocket } from '@/shared/realtime/socket'
import { realtimeStatus } from '@/shared/realtime/status'
import { applyNftUpdated, applyOrderUpdated, reconcileAfterReconnect } from './apply-events'

/**
 * One Socket.IO connection per session "epoch" (guest, or one signed-in
 * user). When the session changes, the old socket is closed with all its
 * listeners and a new one starts, so an event that was meant for the
 * previous user can never be applied after the switch.
 */
export function RealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let epoch = 0
    let socket: Socket | null = null

    const close = () => {
      epoch += 1
      if (socket) {
        socket.removeAllListeners()
        socket.io.removeAllListeners()
        socket.disconnect()
        socket = null
      }
      realtimeStatus.set('connecting')
    }

    const open = async () => {
      const myEpoch = ++epoch
      const token = sessionStore.token()
      const userId = sessionStore.userId()
      const next = await createSocket()
      // The session changed (or the component unmounted) while loading.
      if (myEpoch !== epoch) {
        next.disconnect()
        return
      }
      socket = next
      const current = () => myEpoch === epoch

      next.on('connect', () => {
        realtimeStatus.set('connected')
        // Bind this connection to the user, so private events reach it.
        if (token) next.emit('session.auth', { token })
      })
      next.on('disconnect', () => current() && realtimeStatus.set('disconnected'))
      next.on('connect_error', () => current() && realtimeStatus.set('disconnected'))
      next.io.on('reconnect', () => current() && reconcileAfterReconnect(queryClient, userId))
      next.on(REALTIME_EVENTS.nftUpdated, (payload: unknown) => current() && applyNftUpdated(queryClient, payload))
      next.on(REALTIME_EVENTS.orderUpdated, (payload: unknown) => current() && applyOrderUpdated(queryClient, payload, userId))
      next.connect()
    }

    void open()
    const unsubscribe = sessionStore.subscribe(() => {
      close()
      void open()
    })
    return () => {
      unsubscribe()
      close()
    }
  }, [queryClient])

  return null
}
