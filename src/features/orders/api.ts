import { OrderListSchema, OrderSchema, type CreateOrderInput } from '@/contracts/order'
import { WalletListSchema } from '@/contracts/wallet'
import { getParsed, http } from '@/shared/api/client'

/** Order creation waits less than other calls, so a lost answer is retried sooner. */
export const ORDER_TIMEOUT_MS = 8_000

export const createOrder = (input: CreateOrderInput, idempotencyKey: string) =>
  http
    .post('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey }, timeout: ORDER_TIMEOUT_MS })
    .then((r) => OrderSchema.parse(r.data))

export const fetchOrder = (id: string, signal?: AbortSignal) =>
  getParsed(`/orders/${encodeURIComponent(id)}`, OrderSchema, { signal })

export const fetchPendingOrders = (signal?: AbortSignal) =>
  getParsed('/orders', OrderListSchema, { params: { status: 'pending' }, signal })

export const fetchWallets = (signal?: AbortSignal) => getParsed('/wallets', WalletListSchema, { signal })
