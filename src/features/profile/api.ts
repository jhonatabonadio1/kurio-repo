import {
  PasswordChangeResponseSchema,
  ProfileResponseSchema,
  type PasswordChange,
  type ProfileUpdate,
} from '@/contracts/account'
import { sendParsed } from '@/shared/api/client'

/** If-Match carries the version the form was filled from (409 if it changed since). */
export const updateProfile = (input: ProfileUpdate, version: number) =>
  sendParsed('patch', '/me', input, ProfileResponseSchema, { headers: { 'If-Match': String(version) } })

export const changePassword = (input: PasswordChange) =>
  sendParsed('put', '/me/password', input, PasswordChangeResponseSchema)

export const uploadAvatar = (dataUrl: string) => sendParsed('put', '/me/avatar', { dataUrl }, ProfileResponseSchema)

export const removeAvatar = () => sendParsed('delete', '/me/avatar', undefined, ProfileResponseSchema)
