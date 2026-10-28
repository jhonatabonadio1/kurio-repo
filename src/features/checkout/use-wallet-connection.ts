import * as React from 'react'

import type { WalletType } from '@/contracts/wallet'

/**
 * Simulated wallet connection (real extensions are out of scope).
 * idle -> requesting -> connected | refused; any change of wallet,
 * network or provider disconnects.
 */
export type WalletConnection =
  | { status: 'idle'; reason?: 'changed' | 'disconnected' }
  | { status: 'requesting'; provider: WalletType }
  | { status: 'connected'; provider: WalletType; connectedAt: number }
  | { status: 'refused'; provider: WalletType }

export function useWalletConnection(dependencies: unknown[]) {
  const [state, setState] = React.useState<WalletConnection>({ status: 'idle' })
  const first = React.useRef(true)

  // Changing what is being connected ends the current connection.
  React.useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setState((prev) => (prev.status === 'idle' ? prev : { status: 'idle', reason: 'changed' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return {
    state,
    request: (provider: WalletType) => setState({ status: 'requesting', provider }),
    approve: (provider: WalletType) => setState({ status: 'connected', provider, connectedAt: Date.now() }),
    refuse: (provider: WalletType) => setState({ status: 'refused', provider }),
    disconnect: () => setState({ status: 'idle', reason: 'disconnected' }),
  }
}
