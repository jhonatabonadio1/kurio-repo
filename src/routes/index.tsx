import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'

import { CATALOG_SORT_LABELS, CATALOG_SORTS, CatalogSearchSchema, type CatalogSort } from '@/contracts/catalog'
import { CatalogFilters } from '@/features/catalog/components/catalog-filters'
import { CatalogPagination } from '@/features/catalog/components/catalog-pagination'
import { CatalogToolbar } from '@/features/catalog/components/catalog-toolbar'
import { MobileSearchBar } from '@/features/catalog/components/mobile-search-bar'
import { NftGrid } from '@/features/catalog/components/nft-grid'
import { nftListQueryOptions } from '@/features/catalog/queries'
import { useCatalogSearch } from '@/features/catalog/use-catalog-search'
import { BlogSection } from '@/features/home/blog-section'
import { FeaturedBanner } from '@/features/home/featured-banner'
import { HeroDesktop, HeroMobile } from '@/features/home/hero'
import { PromoCards } from '@/features/home/promo-cards'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'

export const Route = createFileRoute('/')({
  validateSearch: CatalogSearchSchema,
  loaderDeps: ({ search }) => search,
  // Start the request during navigation without blocking it: skeletons show meanwhile.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQueryOptions(deps))
  },
  component: HomePage,
})

function HomePage() {
  const { search, update, clear, activeFilterCount } = useCatalogSearch()
  const list = useQuery(nftListQueryOptions(search))
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const openFilters = React.useCallback(() => setFiltersOpen(true), [])
  useDocumentTitle(search.q ? `“${search.q}” — Kurio` : 'Kurio — Marketplace de NFTs')

  const hasFilters = activeFilterCount > 0 || Boolean(search.q) || Boolean(search.tab)
  const data = list.data

  return (
    <div className="flex flex-col gap-6 md:gap-24">
      <MobileSearchBar value={search.q} update={update} onOpenFilters={openFilters} activeFilterCount={activeFilterCount} />
      <HeroMobile />
      <HeroDesktop />

      <section id="catalogo" aria-labelledby="catalog-title" className="scroll-mt-6 lg:grid lg:grid-cols-[310px_1fr] lg:gap-12">
        <h2 id="catalog-title" className="sr-only">
          Catálogo
        </h2>
        <div className="hidden lg:block">
          <CatalogFilters facets={data?.facets} search={search} update={update} idPrefix="sidebar" />
          <FeaturedBanner />
        </div>

        <div className="flex flex-col gap-5 md:gap-8">
          <CatalogToolbar search={search} update={update} activeFilterCount={activeFilterCount} onOpenFilters={openFilters} />
          <p className="sr-only" aria-live="polite">
            {list.isPending ? 'Carregando NFTs' : data ? `${data.total} NFTs encontrados, página ${data.page} de ${Math.max(data.totalPages, 1)}` : ''}
          </p>
          <NftGrid query={list} hasFilters={hasFilters} onClearFilters={clear} />
          {data && data.items.length > 0 && <CatalogPagination page={data.page} totalPages={data.totalPages} />}
        </div>
      </section>

      <PromoCards />
      <BlogSection />

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="lg:hidden">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Os resultados atualizam a cada escolha.</SheetDescription>
          </SheetHeader>
          {/* On mobile the sort lives here: the Figma has no sort control on the page. */}
          <label className="flex flex-col gap-2 pt-2 text-[15px] font-bold md:hidden">
            Ordenar por
            <select
              value={search.sort ?? 'recent'}
              onChange={(e) => update({ sort: e.target.value as CatalogSort })}
              className="h-10 rounded-md border border-border bg-transparent px-3 text-sm font-normal"
            >
              {CATALOG_SORTS.map((value) => (
                <option key={value} value={value} className="bg-card">
                  {CATALOG_SORT_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <CatalogFilters facets={data?.facets} search={search} update={update} idPrefix="sheet" className="pt-2" />
        </SheetContent>
      </Sheet>
    </div>
  )
}
