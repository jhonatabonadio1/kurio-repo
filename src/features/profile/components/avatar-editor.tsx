import { ImageIcon, Loader2 } from 'lucide-react'
import * as React from 'react'

import type { User } from '@/contracts/account'
import { Button } from '@/shared/ui/button'
import { toast } from '@/shared/ui/toaster'
import { AVATAR_ACCEPT, AvatarImageError, toAvatarDataUrl } from '../avatar-image'
import { useAvatarMutation } from '../mutations'

/** Figma "Avatar": 50px circle, "Alterar" (primary) and "Remover" (text). Uploads at once. */
export function AvatarEditor({ user }: { user: User }) {
  const input = React.useRef<HTMLInputElement>(null)
  const mutation = useAvatarMutation()
  const [processing, setProcessing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const busy = processing || mutation.isPending

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setProcessing(true)
    try {
      await mutation.mutateAsync(await toAvatarDataUrl(file))
      toast('Foto do perfil atualizada.', 'success')
    } catch (e) {
      setError(e instanceof AvatarImageError || e instanceof Error ? e.message : 'Não foi possível enviar a foto.')
    } finally {
      setProcessing(false)
      // Picking the same file again must fire change again.
      if (input.current) input.current.value = ''
    }
  }

  const remove = () => {
    setError(null)
    mutation.mutate(null, {
      onSuccess: () => toast('Foto removida.', 'success'),
      onError: (e) => setError(e.message),
    })
  }

  return (
    <div role="group" aria-labelledby="avatar-label" className="flex flex-col gap-2.5">
      <span id="avatar-label" className="text-base leading-5">
        Avatar
      </span>
      <div className="flex items-center gap-6">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="Sua foto de perfil" width={50} height={50} className="size-[50px] rounded-full object-cover" />
        ) : (
          <span className="grid size-[50px] place-items-center rounded-full bg-surface-card text-text-secondary" role="img" aria-label="Sem foto de perfil">
            <ImageIcon className="size-5" aria-hidden />
          </span>
        )}
        <Button type="button" className="w-[98px]" onClick={() => input.current?.click()} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          Alterar
        </Button>
        <button
          type="button"
          onClick={() => (user.avatarUrl ? remove() : toast('Você ainda não tem foto de perfil.', 'info'))}
          disabled={busy}
          className="text-base text-foreground transition-colors hover:text-text-accent"
        >
          Remover
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept={AVATAR_ACCEPT}
        aria-label="Foto de perfil: PNG, JPEG ou WebP até 5 MB"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  )
}
