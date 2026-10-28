import { getRouteApi } from '@tanstack/react-router'
import { useCallback } from 'react'

import type { CatalogSearch } from '@/contracts/catalog'

const homeRoute = getRouteApi('/')

/**
 * Reads and writes the catalog state in the URL. Any change other than the
 * page itself goes back to page 1. Empty values are removed from the URL.
 */
export function useCatalogSearch() {
  const search = homeRoute.useSearch()
  const navigate = homeRoute.useNavigate()

  const update = useCallback(
    (patch: Partial<CatalogSearch>, options: { replace?: boolean } = {}) => {
      const resetsPage = !('page' in patch)
      void navigate({
        search: (prev) => {
          const next: CatalogSearch = { ...prev, ...patch }
          if (resetsPage) next.page = undefined
          if (next.page === 1) next.page = undefined
          if (next.categories?.length === 0) next.categories = undefined
          if (next.chains?.length === 0) next.chains = undefined
          if (next.tab === 'all') next.tab = undefined
          if (next.sort === 'recent') next.sort = undefined
          return next
        },
        replace: options.replace,
        resetScroll: false,
      })
    },
    [navigate],
  )

  const clear = useCallback(
    () => void navigate({ search: {}, resetScroll: false }),
    [navigate],
  )

  const activeFilterCount =
    (search.categories?.length ?? 0) + (search.chains?.length ?? 0) + (search.minPrice || search.maxPrice ? 1 : 0)

  return { search, update, clear, activeFilterCount }
}
