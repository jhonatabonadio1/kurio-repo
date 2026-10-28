import { COUPON_FIXTURES, USER_FIXTURES, WALLET_FIXTURES } from '../fixtures/accounts'
import { createNftFixtures } from '../fixtures/nfts'
import type { MockDbState } from './types'

/**
 * The single source of truth for every mock: REST handlers and socket
 * events read and write the same state, so they never disagree.
 *
 * Persisted to localStorage after every write (survives refresh);
 * `reset()` restores the exact seed. Without localStorage (Node checks)
 * it stays in memory.
 */
const STORAGE_KEY = 'kurio-mock-db'
const SCHEMA_VERSION = 2

export function createSeed(): MockDbState {
  return {
    schemaVersion: SCHEMA_VERSION,
    users: structuredClone(USER_FIXTURES),
    sessions: [],
    nfts: createNftFixtures(),
    favorites: { usr_alice: ['neon-vessel-552'], usr_bruno: [] },
    carts: {},
    coupons: structuredClone(COUPON_FIXTURES),
    quotes: {},
    orders: {},
    idempotency: {},
    wallets: structuredClone(WALLET_FIXTURES),
    eventSeq: 0,
  }
}

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function load(): MockDbState {
  const raw = storage()?.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as MockDbState
      if (parsed.schemaVersion === SCHEMA_VERSION) return parsed
    } catch {
      // Corrupted or from an older build: fall through to a fresh seed.
    }
  }
  return createSeed()
}

let state: MockDbState = load()

function persist() {
  storage()?.setItem(STORAGE_KEY, JSON.stringify(state))
}

type Listener = () => void
const resetListeners = new Set<Listener>()

export const db = {
  /** Read-only access. Do not mutate the returned objects. */
  read<T>(fn: (s: Readonly<MockDbState>) => T): T {
    return fn(state)
  },
  /** Mutate the state and persist it. */
  write<T>(fn: (s: MockDbState) => T): T {
    const result = fn(state)
    persist()
    return result
  },
  /** Restore the known seed (and tell listeners, e.g. to drop sockets and timers). */
  reset() {
    state = createSeed()
    persist()
    for (const listener of resetListeners) listener()
  },
  onReset(listener: Listener) {
    resetListeners.add(listener)
    return () => resetListeners.delete(listener)
  },
  nextEventId(prefix: string) {
    return db.write((s) => `${prefix}_${++s.eventSeq}`)
  },
}
