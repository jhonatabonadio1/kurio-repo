import { z } from 'zod'

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/
export const PasswordSchema = z
  .string()
  .regex(PASSWORD_RULE, 'Use 8 a 64 caracteres, com letras e números.')

export const UsernameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_.]{3,24}$/, 'Use 3 a 24 caracteres: letras minúsculas, números, "_" ou ".".')

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  email: z.email(),
  ensName: z.string().nullable(),
  walletAlias: z.string().nullable(),
  /** Data URL (mock) or http URL. */
  avatarUrl: z.string().nullable(),
  version: z.number().int().nonnegative(),
})
export type User = z.infer<typeof UserSchema>

export const SessionSchema = z.object({
  user: UserSchema,
  token: z.string(),
  expiresAt: z.iso.datetime(),
})
export type Session = z.infer<typeof SessionSchema>

/** GET /auth/session does not resend the token. */
export const SessionInfoSchema = SessionSchema.omit({ token: true })
export type SessionInfo = z.infer<typeof SessionInfoSchema>

export const LoginInputSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})
export type LoginInput = z.infer<typeof LoginInputSchema>

export const RegisterInputSchema = z
  .object({
    username: UsernameSchema,
    email: z.email('Informe um e-mail válido.'),
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
export type RegisterInput = z.infer<typeof RegisterInputSchema>

/** Fields of the "Perfil do colecionador" frame. */
export const ProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2, 'Mínimo de 2 caracteres.').max(40),
  username: UsernameSchema,
  email: z.email('Informe um e-mail válido.'),
  // Required in the Figma ("Perfil do colecionador" marks every field).
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,32}$/, 'Use 3 a 32 caracteres: letras minúsculas, números ou "-".'),
  walletAlias: z.string().trim().min(2, 'Mínimo de 2 caracteres.').max(30),
})
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>

export const ProfileResponseSchema = z.object({ user: UserSchema })
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>

/** The client crops and resizes to 256×256 before upload; this caps what reaches the API. */
export const AVATAR_SIZE = 256
export const AVATAR_MAX_CHARS = 200_000
export const AvatarInputSchema = z.object({
  dataUrl: z
    .string()
    .max(AVATAR_MAX_CHARS, 'A imagem ficou grande demais. Tente outra.')
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Envie uma imagem PNG, JPEG ou WebP.'),
})
export type AvatarInput = z.infer<typeof AvatarInputSchema>

export const AvatarUploadSchema = z.object({
  /** data:image/(png|jpeg|webp);base64,... — max ~1 MB after encoding. */
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, 'Envie uma imagem PNG, JPG ou WebP.')
    .max(1_400_000, 'A imagem deve ter até 1 MB.'),
})
export type AvatarUpload = z.infer<typeof AvatarUploadSchema>

export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual.',
  })
export type PasswordChange = z.infer<typeof PasswordChangeSchema>

/** Changing the password ends every other session of the user. */
export const PasswordChangeResponseSchema = z.object({ revokedSessions: z.number().int().nonnegative() })
