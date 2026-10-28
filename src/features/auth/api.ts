import {
  SessionInfoSchema,
  SessionSchema,
  type LoginInput,
  type RegisterInput,
} from '@/contracts/account'
import { getParsed, http, sendParsed } from '@/shared/api/client'

export const login = (input: LoginInput) => sendParsed('post', '/auth/login', input, SessionSchema)
export const register = (input: RegisterInput) => sendParsed('post', '/auth/register', input, SessionSchema)
export const fetchSession = (signal?: AbortSignal) => getParsed('/auth/session', SessionInfoSchema, { signal })
export const logout = () => http.post('/auth/logout')
