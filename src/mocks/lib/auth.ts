import type { User } from '@/contracts/account'
import { getMockConfig } from '../config'
import { db } from '../db/store'
import type { SessionRecord, UserRecord } from '../db/types'
import { randomToken } from './crypto'
import { errors } from './http'

/** Sessions last 2 hours (mock clock = Date.now, so Playwright can move it). */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000
/** In the session-expired scenario, the session dies on this authenticated request. */
const EXPIRE_ON_REQUEST = 3

export const toPublicUser = ({ passwordHash: _h, salt: _s, ...user }: UserRecord): User => user

export function createSession(userId: string): SessionRecord {
  const now = Date.now()
  const session: SessionRecord = {
    token: randomToken(),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
    uses: 0,
  }
  db.write((s) => {
    s.sessions.push(session)
  })
  return session
}

const bearer = (request: Request) => {
  const header = request.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

const dropSession = (token: string) =>
  db.write((s) => {
    s.sessions = s.sessions.filter((x) => x.token !== token)
  })

export type AuthContext = { user: UserRecord; session: SessionRecord }

/**
 * Resolves the session of an authenticated request, or the 401 to return.
 * Codes: UNAUTHENTICATED (no token), INVALID_SESSION (unknown token),
 * SESSION_EXPIRED (expired by time or by the scenario).
 */
export function authenticate(request: Request): AuthContext | Response {
  const token = bearer(request)
  if (!token) return errors.unauthorized()
  const session = db.read((s) => s.sessions.find((x) => x.token === token))
  if (!session) return errors.unauthorized('INVALID_SESSION', 'Sua sessão não é válida. Entre novamente.')

  const expiredByTime = Date.parse(session.expiresAt) <= Date.now()
  const uses = db.write((s) => {
    const record = s.sessions.find((x) => x.token === token)!
    record.uses += 1
    return record.uses
  })
  const expiredByScenario = getMockConfig().scenario === 'session-expired' && uses >= EXPIRE_ON_REQUEST
  if (expiredByTime || expiredByScenario) {
    dropSession(token)
    return errors.unauthorized('SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }

  const user = db.read((s) => s.users.find((u) => u.id === session.userId))
  if (!user) {
    dropSession(token)
    return errors.unauthorized('INVALID_SESSION', 'Sua sessão não é válida. Entre novamente.')
  }
  return { user, session }
}

export const endSession = (request: Request) => {
  const token = bearer(request)
  if (token) dropSession(token)
}
