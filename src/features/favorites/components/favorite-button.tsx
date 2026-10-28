import { HeartIconButton } from '@/shared/ui/heart-icon-button'
import { useFavorite } from '../use-favorite'

/** Round heart wired to the optimistic favorite toggle. */
export function FavoriteButton({ nftId, nftName }: { nftId: string; nftName: string }) {
  const fav = useFavorite(nftId, nftName)
  return <HeartIconButton active={fav.favorite} onClick={fav.toggle} label={fav.label} size={35} />
}
