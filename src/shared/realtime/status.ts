import { useSyncExternalStore } from 'react'

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

let status: RealtimeStatus = 'connecting'
const listeners = new Set<() => void>()

export const realtimeStatus = {
  get: () => status,
  set(next: RealtimeStatus) {
    if (next === status) return
    status = next
    // Visible state for debugging and E2E tests: <html data-realtime="connected">.
    if (typeof document !== 'undefined') document.documentElement.dataset.realtime = next
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export const useRealtimeStatus = () => useSyncExternalStore(realtimeStatus.subscribe, realtimeStatus.get, () => 'connecting' as const)
