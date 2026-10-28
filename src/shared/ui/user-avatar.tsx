import type { User } from '@/contracts/account'
import { cn } from '@/shared/lib/utils'

/** Photo or initial. Decorative: the name is always written next to it. */
export function UserAvatar({ user, size = 35, className }: { user: Pick<User, 'displayName' | 'avatarUrl'>; size?: number; className?: string }) {
  const style = { width: size, height: size }
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" width={size} height={size} style={style} className={cn('shrink-0 rounded-full object-cover', className)} />
  }
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: Math.round(size * 0.4) }}
      className={cn('grid shrink-0 place-items-center rounded-full bg-surface-dark font-bold text-text-accent', className)}
    >
      {user.displayName.slice(0, 1).toUpperCase()}
    </span>
  )
}
