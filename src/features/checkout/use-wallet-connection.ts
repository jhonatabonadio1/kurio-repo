import * as React from 'react'

import type { WalletType } from '@/contracts/wallet'

/**
 * Simulated wallet connection (real extensions are out of scope).
 * idle -> requesting -> connected | refused. A connection belongs to one
 * target (wallet + network + provider): changing any of them disconnects,
 * derived from the key, with no effect needed.
 */
type State =
  | { status: 'idle' }
  | { status: 'requesting'; target: string }
  | { status: 'connected'; target: string }
  | { status: 'refused'; target: string }
  | { status: 'disconnected'; target: string }

export function useWalletConnection(target: string, provider: WalletType) {
  const [state, setState] = React.useState<State>({ status: 'idle' })
  const [onConnected, setOnConnected] = React.useState<(() => void) | null>(null)
  const sameTarget = 'target' in state && state.target === target
  const status = sameTarget ? state.status : 'target' in state && state.status === 'connected' ? 'changed' : 'idle'

  return {
    provider,
    status: status as 'idle' | 'requesting' | 'connected' | 'refused' | 'disconnected' | 'changed',
    connected: status === 'connected',
    /** Opens the simulated wallet prompt; `then` runs once the user approves. */
    request: (then?: () => void) => {
      setOnConnected(() => then ?? null)
      setState({ status: 'requesting', target })
    },
    approve: () => {
      setState({ status: 'connected', target })
      const next = onConnected
      setOnConnected(null)
      next?.()
    },
    refuse: () => {
      setOnConnected(null)
      setState({ status: 'refused', target })
    },
    disconnect: () => setState({ status: 'disconnected', target }),
  }
}

export type WalletConnection = ReturnType<typeof useWalletConnection>
