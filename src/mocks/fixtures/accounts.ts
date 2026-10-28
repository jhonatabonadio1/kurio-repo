import type { User } from '@/contracts/account'
import type { Wallet } from '@/contracts/wallet'

/**
 * Two fixture collectors. Password for both: Test@1234 (fictitious).
 * Only the salted hash is stored; see lib/crypto.ts.
 */
export const FIXTURE_PASSWORD = 'Test@1234'

export type UserRecord = User & { passwordHash: string; salt: string }

export const USER_FIXTURES: UserRecord[] = [
  {
    id: 'usr_alice',
    username: 'alice',
    displayName: 'Alice Martins',
    email: 'alice@test.dev',
    ensName: 'alice',
    walletAlias: 'Principal',
    avatarUrl: null,
    version: 1,
    salt: 'alice-salt-v1',
    passwordHash: '7fe29eca8a5e3a685076f11edb2f0bc54c100db974ebdf5211330cfa1ac43f86',
  },
  {
    id: 'usr_bruno',
    username: 'bruno',
    displayName: 'Bruno Costa',
    email: 'bruno@test.dev',
    ensName: 'bruno',
    walletAlias: 'Carteira do Bruno',
    avatarUrl: null,
    version: 1,
    salt: 'bruno-salt-v1',
    passwordHash: '3b3833173716fd348dcb973b71734421f30fdb6c6811fde4393800ff20782d22',
  },
]

export type WalletRecord = Wallet & { userId: string }

/** Alice has the two wallets shown in the mobile checkout frame; Bruno has one. */
export const WALLET_FIXTURES: WalletRecord[] = [
  {
    id: 'wal_alice_primary',
    userId: 'usr_alice',
    slot: 'primary',
    displayName: 'Principal',
    alias: 'Principal',
    network: 'ethereum',
    profileName: 'Alice Martins',
    address: '0xA91F3c5D7e2B4a6C8d0E1f2A3b4C5d6E7f80E82C',
    secondaryAddress: null,
    walletType: 'metamask',
    referralCode: 'KURIO10',
    email: 'alice@test.dev',
    ensName: 'alice',
    version: 1,
  },
  {
    id: 'wal_alice_secondary',
    userId: 'usr_alice',
    slot: 'secondary',
    displayName: 'Reserva',
    alias: 'Reserva',
    network: 'polygon',
    profileName: 'Alice Martins',
    address: '0x5B2e9A1c4D7f0E3b6A8c1D2e3F4a5B6c7D8e9F01',
    secondaryAddress: 'nova.kurio.eth',
    walletType: 'walletconnect',
    referralCode: 'KURIO10',
    email: 'alice@test.dev',
    ensName: 'nova',
    version: 1,
  },
  {
    id: 'wal_bruno_primary',
    userId: 'usr_bruno',
    slot: 'primary',
    displayName: 'Carteira do Bruno',
    alias: 'Bruno',
    network: 'ethereum',
    profileName: 'Bruno Costa',
    address: '0x3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9A0b1C2D',
    secondaryAddress: null,
    walletType: 'coinbase',
    referralCode: 'BRUNO22',
    email: 'bruno@test.dev',
    ensName: 'bruno',
    version: 1,
  },
]

export type CouponRecord = { code: string; percentOff: number; expiresAt: string }

export const COUPON_FIXTURES: CouponRecord[] = [
  { code: 'WELCOME10', percentOff: 10, expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'KURIO25', percentOff: 25, expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'OLD20', percentOff: 20, expiresAt: '2025-01-01T00:00:00.000Z' },
]
