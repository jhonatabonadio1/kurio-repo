import { http, HttpResponse } from 'msw'

import {
  AvatarInputSchema,
  PasswordChangeSchema,
  ProfileUpdateSchema,
  type ProfileResponse,
} from '@/contracts/account'
import { getMockConfig, onMockConfigChange } from '../config'
import { db } from '../db/store'
import type { UserRecord } from '../db/types'
import { authenticate, toPublicUser } from '../lib/auth'
import { hashPassword, randomId } from '../lib/crypto'
import { errors } from '../lib/http'
import { readJson, zodFields } from '../lib/validation'
import { withNetwork } from '../network'

const respond = (user: UserRecord) => HttpResponse.json<ProfileResponse>({ user: toPublicUser(user) })

/**
 * Applies a change to the signed-in user. `version` covers the profile form
 * fields only: avatar and password changes do not bump it, so they never
 * make an open profile form look stale.
 */
const updateUser = (userId: string, patch: Partial<UserRecord>, bumpVersion: boolean) =>
  db.write((s) => {
    const user = s.users.find((u) => u.id === userId)!
    Object.assign(user, patch, bumpVersion ? { version: user.version + 1 } : {})
    return { ...user }
  })

// profile-conflict: the first save after the scenario starts finds a newer
// version, as if another tab had saved the profile a moment before.
let conflictPending = true
onMockConfigChange(() => {
  conflictPending = true
})

const versionConflict = () =>
  errors.conflict('VERSION_CONFLICT', 'Seu perfil foi alterado em outra aba ou dispositivo. Confira os dados atuais antes de salvar.')

export const profileHandlers = [
  /**
   * Optimistic concurrency: the client sends the version it edited in
   * If-Match; an older version answers 409 instead of overwriting.
   */
  http.patch(
    '*/api/me',
    withNetwork('me.update', async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = ProfileUpdateSchema.safeParse(await readJson(request))
      if (!parsed.success) return errors.validation(zodFields(parsed.error))
      const userId = auth.user.id

      if (getMockConfig().scenario === 'profile-conflict' && conflictPending) {
        conflictPending = false
        updateUser(userId, { displayName: `${auth.user.displayName} (outra aba)` }, true)
      }
      const ifMatch = Number(request.headers.get('If-Match'))
      const current = db.read((s) => s.users.find((u) => u.id === userId)!)
      if (!Number.isInteger(ifMatch) || ifMatch !== current.version) return versionConflict()

      const input = parsed.data
      const email = input.email.toLowerCase()
      const taken = db.read((s) => ({
        email: s.users.some((u) => u.id !== userId && u.email.toLowerCase() === email),
        username: s.users.some((u) => u.id !== userId && u.username === input.username),
      }))
      if (taken.email) {
        return errors.conflict('EMAIL_TAKEN', 'Este e-mail já está cadastrado.', { email: 'Este e-mail já está cadastrado.' })
      }
      if (taken.username) {
        const message = 'Este nome de usuário já está em uso.'
        return errors.conflict('USERNAME_TAKEN', message, { username: message })
      }
      return respond(
        updateUser(userId, {
          displayName: input.displayName,
          username: input.username,
          email,
          ensName: input.ensName || null,
          walletAlias: input.walletAlias || null,
        }, true),
      )
    }),
  ),

  http.put(
    '*/api/me/password',
    withNetwork('me.password', async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = PasswordChangeSchema.safeParse(await readJson(request))
      if (!parsed.success) return errors.validation(zodFields(parsed.error))
      const { currentPassword, newPassword } = parsed.data
      const user = auth.user

      if ((await hashPassword(currentPassword, user.salt)) !== user.passwordHash) {
        return errors.validation({ currentPassword: 'Senha atual incorreta.' })
      }
      if (newPassword === currentPassword) {
        return errors.validation({ newPassword: 'A nova senha deve ser diferente da atual.' })
      }
      const salt = randomId('salt')
      const passwordHash = await hashPassword(newPassword, salt)
      const revokedSessions = db.write((s) => {
        const record = s.users.find((u) => u.id === user.id)!
        Object.assign(record, { salt, passwordHash })
        // Keep this session; end the others (stolen tokens stop working).
        const before = s.sessions.length
        s.sessions = s.sessions.filter((x) => x.userId !== user.id || x.token === auth.session.token)
        return before - s.sessions.length
      })
      return HttpResponse.json({ revokedSessions })
    }),
  ),

  http.put(
    '*/api/me/avatar',
    withNetwork('me.avatar', async ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      const parsed = AvatarInputSchema.safeParse(await readJson(request))
      if (!parsed.success) return errors.validation(zodFields(parsed.error))
      return respond(updateUser(auth.user.id, { avatarUrl: parsed.data.dataUrl }, false))
    }),
  ),

  http.delete(
    '*/api/me/avatar',
    withNetwork('me.avatar.delete', ({ request }) => {
      const auth = authenticate(request)
      if (auth instanceof Response) return auth
      return respond(updateUser(auth.user.id, { avatarUrl: null }, false))
    }),
  ),
]
