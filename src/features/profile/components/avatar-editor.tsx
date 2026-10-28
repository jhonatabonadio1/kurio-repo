import { ImageUp, Loader2, Trash2 } from 'lucide-react'
import * as React from 'react'

import type { User } from '@/contracts/account'
import { Button } from '@/shared/ui/button'
import { toast } from '@/shared/ui/toaster'
import { UserAvatar } from '@/shared/ui/user-avatar'
import { AVATAR_ACCEPT, AvatarImageError, toAvatarDataUrl } from '../avatar-image'
import { useAvatarMutation } from '../mutations'

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
      const dataUrl = await toAvatarDataUrl(file)
      await mutation.mutateAsync(dataUrl)
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <UserAvatar user={user} size={96} className="text-3xl" />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <ImageUp className="size-4" aria-hidden />}
            {user.avatarUrl ? 'Trocar foto' : 'Enviar foto'}
          </Button>
          {user.avatarUrl && (
            <Button type="button" size="sm" variant="outline" onClick={remove} disabled={busy}>
              <Trash2 className="size-4" aria-hidden /> Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-text-secondary">PNG, JPEG ou WebP até 5 MB. A imagem é recortada em quadrado.</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <input
          ref={input}
          type="file"
          accept={AVATAR_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}
