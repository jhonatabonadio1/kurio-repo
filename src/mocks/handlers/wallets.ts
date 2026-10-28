import { http, HttpResponse } from 'msw'

import { WALLET_LIMIT, WalletInputSchema, type Wallet, type WalletInput, type WalletMutationResponse } from '@/contracts/wallet'
import { db } from '../db/store'
import type { MockDbState, WalletRecord } from '../db/types'
import { authenticate } from '../lib/auth'
import { randomId } from '../lib/crypto'
import { errors } from '../lib/http'
import { readJson, zodFields } from '../lib/validation'
import { withNetwork } from '../network'

export const toWalletResponse = ({ userId: _u, ...wallet }: WalletRecord): Wallet => wallet

/** The user's wallets, primary first. Other users' wallets are never listed. */
function walletsOf(s: Readonly<MockDbState>, userId: string): Wallet[] {
  return s.wallets
    .filter((w) => w.userId === userId)
    .sort((a, b) => (a.slot === b.slot ? 0 : a.slot === 'primary' ? -1 : 1))
    .map(toWalletResponse)
}

function respond(userId: string, wallet: WalletRecord | null, status = 200) {
  const body: WalletMutationResponse = {
    wallet: wallet ? toWalletResponse(wallet) : null,
    wallets: db.read((s) => walletsOf(s, userId)),
  }
  return HttpResponse.json(body, { status })
}

/** Empty optional fields are stored as null. */
function toRecordFields(input: WalletInput) {
  return {
    ...input,
    secondaryAddress: input.secondaryAddress || null,
  }
}

const duplicateAddress = () =>
  errors.conflict('WALLET_DUPLICATE', 'Este endereço já está cadastrado na sua conta.', {
    address: 'Este endereço já está cadastrado na sua conta.',
  })

/** Another user's wallet answers 404, the same as a missing one: ids do not leak. */
const notFound = () => errors.notFound('WALLET_NOT_FOUND', 'Carteira não encontrada.')

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export const walletHandlers = [
  http.get(
    '*/api/wallets',
    withNetwork('wallets.list', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      return HttpResponse.json({ wallets: db.read((s) => walletsOf(s, auth.user.id)) })
    }),
  ),

  http.post(
    '*/api/wallets',
    withNetwork('wallets.create', async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = WalletInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return errors.validation(zodFields(parsed.error))
      const userId = auth.user.id

      const own = db.read((s) => s.wallets.filter((w) => w.userId === userId))
      if (own.length >= WALLET_LIMIT) {
        return errors.conflict('WALLET_LIMIT', `Você já tem ${WALLET_LIMIT} carteiras. Remova uma para cadastrar outra.`)
      }
      if (own.some((w) => sameAddress(w.address, parsed.data.address))) return duplicateAddress()

      const wallet: WalletRecord = {
        ...toRecordFields(parsed.data),
        id: randomId('wal'),
        userId,
        // The first wallet becomes the primary one.
        slot: own.some((w) => w.slot === 'primary') ? 'secondary' : 'primary',
        version: 1,
      }
      db.write((s) => {
        s.wallets.push(wallet)
      })
      return respond(userId, wallet, 201)
    }),
  ),

  http.put<{ walletId: string }>(
    '*/api/wallets/:walletId',
    withNetwork('wallets.update', async ({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const userId = auth.user.id
      const current = db.read((s) => s.wallets.find((w) => w.id === params.walletId && w.userId === userId))
      if (!current) return notFound()
      const parsed = WalletInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return errors.validation(zodFields(parsed.error))
      const clash = db.read((s) =>
        s.wallets.some((w) => w.userId === userId && w.id !== current.id && sameAddress(w.address, parsed.data.address)),
      )
      if (clash) return duplicateAddress()

      const updated = db.write((s) => {
        const wallet = s.wallets.find((w) => w.id === current.id)!
        Object.assign(wallet, toRecordFields(parsed.data), { version: wallet.version + 1 })
        return { ...wallet }
      })
      return respond(userId, updated)
    }),
  ),

  http.post<{ walletId: string }>(
    '*/api/wallets/:walletId/primary',
    withNetwork('wallets.primary', ({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const userId = auth.user.id
      const updated = db.write((s) => {
        const target = s.wallets.find((w) => w.id === params.walletId && w.userId === userId)
        if (!target) return null
        if (target.slot !== 'primary') {
          for (const w of s.wallets) {
            if (w.userId !== userId) continue
            w.slot = w.id === target.id ? 'primary' : 'secondary'
            w.version++
          }
        }
        return { ...target }
      })
      return updated ? respond(userId, updated) : notFound()
    }),
  ),

  http.delete<{ walletId: string }>(
    '*/api/wallets/:walletId',
    withNetwork('wallets.delete', ({ request, params }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const userId = auth.user.id
      const removed = db.write((s) => {
        const index = s.wallets.findIndex((w) => w.id === params.walletId && w.userId === userId)
        if (index === -1) return false
        const [wallet] = s.wallets.splice(index, 1)
        // Removing the primary promotes the remaining wallet.
        if (wallet?.slot === 'primary') {
          const next = s.wallets.find((w) => w.userId === userId)
          if (next) {
            next.slot = 'primary'
            next.version++
          }
        }
        return true
      })
      return removed ? respond(userId, null) : notFound()
    }),
  ),
]
