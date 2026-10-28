import { http, HttpResponse } from 'msw'

import { LoginInputSchema, RegisterInputSchema, type Session, type SessionInfo } from '@/contracts/account'
import { getMockConfig } from '../config'
import { db } from '../db/store'
import { authenticate, createSession, endSession, toPublicUser } from '../lib/auth'
import { hashPassword, randomId } from '../lib/crypto'
import { errors } from '../lib/http'
import { readJson, zodFields } from '../lib/validation'
import { withNetwork } from '../network'

const EMAIL_TAKEN = 'Este e-mail já está cadastrado.'

export const authHandlers = [
  http.post(
    '*/api/auth/register',
    withNetwork('auth.register', async ({ request }) => {
      const parsed = RegisterInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return errors.validation(zodFields(parsed.error))
      const { username, email, password } = parsed.data
      const normalizedEmail = email.trim().toLowerCase()

      if (getMockConfig().scenario === 'register-conflict') {
        return errors.conflict('EMAIL_TAKEN', EMAIL_TAKEN, { email: EMAIL_TAKEN })
      }
      const taken = db.read((s) => ({
        email: s.users.some((u) => u.email.toLowerCase() === normalizedEmail),
        username: s.users.some((u) => u.username === username),
      }))
      if (taken.email) return errors.conflict('EMAIL_TAKEN', EMAIL_TAKEN, { email: EMAIL_TAKEN })
      if (taken.username) {
        const message = 'Este nome de usuário já está em uso.'
        return errors.conflict('USERNAME_TAKEN', message, { username: message })
      }

      const salt = randomId('salt')
      const user = {
        id: randomId('usr'),
        username,
        displayName: username,
        email: normalizedEmail,
        ensName: null,
        walletAlias: null,
        avatarUrl: null,
        version: 1,
        salt,
        passwordHash: await hashPassword(password, salt),
      }
      db.write((s) => {
        s.users.push(user)
        s.favorites[user.id] = []
      })
      const session = createSession(user.id)
      return HttpResponse.json<Session>(
        { user: toPublicUser(user), token: session.token, expiresAt: session.expiresAt },
        { status: 201 },
      )
    }),
  ),

  http.post(
    '*/api/auth/login',
    withNetwork('auth.login', async ({ request }) => {
      const parsed = LoginInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return errors.validation(zodFields(parsed.error))
      const email = parsed.data.email.trim().toLowerCase()
      const user = db.read((s) => s.users.find((u) => u.email.toLowerCase() === email))
      const valid = user && (await hashPassword(parsed.data.password, user.salt)) === user.passwordHash
      if (!user || !valid) {
        return errors.unauthorized('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
      }
      const session = createSession(user.id)
      return HttpResponse.json<Session>({ user: toPublicUser(user), token: session.token, expiresAt: session.expiresAt })
    }),
  ),

  http.get(
    '*/api/auth/session',
    withNetwork('auth.session', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      return HttpResponse.json<SessionInfo>({ user: toPublicUser(auth.user), expiresAt: auth.session.expiresAt })
    }),
  ),

  http.post(
    '*/api/auth/logout',
    withNetwork('auth.logout', ({ request }) => {
      endSession(request)
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
