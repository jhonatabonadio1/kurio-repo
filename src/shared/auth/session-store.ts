/**
 * Where the session token lives in the browser.
 *
 * localStorage, so a refresh keeps the user signed in. This is a mock-only
 * choice: with a real API the token would be an httpOnly cookie and the
 * page would never read it (see ARCHITECTURE.md › Session).
 */
export type StoredSession = { token: string; userId: string; expiresAt: string }
export type SessionChange =
  | { type: 'signed-in'; session: StoredSession; previousUserId: string | null }
  | { type: 'signed-out'; reason: 'logout' | 'expired'; previousUserId: string | null }

const STORAGE_KEY = 'kurio-session'
const listeners = new Set<(change: SessionChange) => void>()

function read(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    return parsed.token && parsed.userId ? parsed : null
  } catch {
    return null
  }
}

let current = read()

function write(session: StoredSession | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked (private mode): the session lasts until reload.
  }
}

const emit = (change: SessionChange) => listeners.forEach((listener) => listener(change))

export const sessionStore = {
  get: () => current,
  token: () => current?.token ?? null,
  userId: () => current?.userId ?? null,

  signIn(session: StoredSession) {
    const previousUserId = current?.userId ?? null
    current = session
    write(session)
    emit({ type: 'signed-in', session, previousUserId })
  },

  /** Logout or expiry. Safe to call twice (only the first one notifies). */
  signOut(reason: 'logout' | 'expired') {
    if (!current) return
    const previousUserId = current.userId
    current = null
    write(null)
    emit({ type: 'signed-out', reason, previousUserId })
  },

  subscribe(listener: (change: SessionChange) => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// Another tab signed in or out: follow it.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    const next = read()
    if (next && next.token !== current?.token) sessionStore.signIn(next)
    if (!next && current) sessionStore.signOut('logout')
  })
}
