import { AVATAR_MAX_CHARS, AVATAR_SIZE } from '@/contracts/account'

export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp'
const MAX_FILE_BYTES = 5 * 1024 * 1024

export class AvatarImageError extends Error {}

/**
 * Center-crops the picked file to a square and scales it to 256×256, so the
 * upload is a few KB whatever the camera size. WebP when the browser can
 * encode it (Safari cannot), JPEG otherwise.
 */
export async function toAvatarDataUrl(file: File): Promise<string> {
  if (!AVATAR_ACCEPT.split(',').includes(file.type)) throw new AvatarImageError('Escolha uma imagem PNG, JPEG ou WebP.')
  if (file.size > MAX_FILE_BYTES) throw new AvatarImageError('A imagem deve ter até 5 MB.')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new AvatarImageError('Não foi possível ler esta imagem.')
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new AvatarImageError('Seu navegador não conseguiu processar a imagem.')
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  bitmap.close()

  let dataUrl = canvas.toDataURL('image/webp', 0.85)
  if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  if (dataUrl.length > AVATAR_MAX_CHARS) throw new AvatarImageError('A imagem ficou grande demais. Tente outra.')
  return dataUrl
}
