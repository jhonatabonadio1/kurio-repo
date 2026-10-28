import { http, HttpResponse } from 'msw'

import type { Wallet } from '@/contracts/wallet'
import { db } from '../db/store'
import type { WalletRecord } from '../db/types'
import { authenticate } from '../lib/auth'
import { withNetwork } from '../network'

export const toWalletResponse = ({ userId: _u, ...wallet }: WalletRecord): Wallet => wallet

export const walletHandlers = [
  http.get(
    '*/api/wallets',
    withNetwork('wallets.list', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const wallets = db.read((s) => s.wallets.filter((w) => w.userId === auth.user.id))
      // Primary first.
      wallets.sort((a, b) => (a.slot === b.slot ? 0 : a.slot === 'primary' ? -1 : 1))
      return HttpResponse.json({ wallets: wallets.map(toWalletResponse) })
    }),
  ),
]
