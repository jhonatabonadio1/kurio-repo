import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { PasswordChange, ProfileResponse, ProfileUpdate, SessionInfo, User } from '@/contracts/account'
import { sessionQueryOptions } from '@/features/auth/session'
import { changePassword, removeAvatar, updateProfile, uploadAvatar } from './api'

/** The header, checkout and profile read the user from the session query: update it from the response. */
function useSetSessionUser() {
  const queryClient = useQueryClient()
  return ({ user }: ProfileResponse) =>
    queryClient.setQueryData<SessionInfo | null>(sessionQueryOptions().queryKey, (old) => (old ? { ...old, user } : old))
}

export function useUpdateProfile() {
  const setUser = useSetSessionUser()
  return useMutation({
    mutationFn: ({ input, version }: { input: ProfileUpdate; version: number }) => updateProfile(input, version),
    onSuccess: setUser,
  })
}

export function useAvatarMutation() {
  const setUser = useSetSessionUser()
  return useMutation({
    mutationFn: (dataUrl: string | null) => (dataUrl ? uploadAvatar(dataUrl) : removeAvatar()),
    onSuccess: setUser,
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (input: PasswordChange) => changePassword(input) })
}

/** Re-reads the user from the API (after a 409 VERSION_CONFLICT). */
export function useRefreshSessionUser() {
  const queryClient = useQueryClient()
  return async (): Promise<User | null> => {
    const info = await queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 })
    return info?.user ?? null
  }
}
