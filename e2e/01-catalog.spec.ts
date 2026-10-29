import type { Locator } from '@playwright/test'

import { expect, test, type Page } from './fixtures'

// Brief §9.1 — search, combined filters, sort, pagination and history restore.

const cardNames = (page: Page) => page.locator('#catalogo h3 a')
const cardPrices = async (page: Page) =>
  (await page.locator('#catalogo h3 + p > span:first-child').allTextContents()).map((t) => Number(t.replace(/[^\d.]/g, '')))

async function openFilters(page: Page, mobile: boolean) {
  if (!mobile) return page.locator('#catalogo')
  await page.getByRole('button', { name: /^Filtros/ }).click()
  return page.getByRole('dialog', { name: 'Filtros' })
}
/** The checkbox is visually hidden; users click its label ("Arte digital (8)"). */
async function toggle(panel: Locator, name: string) {
  await panel.locator('label').filter({ hasText: new RegExp(`^${name}`) }).click()
}

async function closeFilters(page: Page, mobile: boolean) {
  if (mobile) await page.keyboard.press('Escape')
}

async function search(page: Page, mobile: boolean, term: string) {
  if (mobile) {
    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill(term)
  } else {
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.getByRole('searchbox', { name: 'Termo de busca' }).fill(term)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  }
}

test('search and combined filters compose the URL and the API query', async ({ page, mobile }) => {
  await page.goto('/')
  await expect(cardNames(page)).toHaveCount(9)

  const requests: URL[] = []
  page.on('request', (r) => r.url().includes('/api/nfts?') && requests.push(new URL(r.url())))

  const panel = await openFilters(page, mobile)
  await toggle(panel, 'Arte digital')
  await toggle(panel, 'Música')
  await toggle(panel, 'Ethereum')
  await closeFilters(page, mobile)
  await expect(page).toHaveURL(/categories=arte-digital%2Cmusica|categories=arte-digital,musica/)
  await expect(page).toHaveURL(/chains=ethereum/)

  const last = () => requests.at(-1)!
  await expect.poll(() => last()?.searchParams.get('chain')).toBe('ethereum')
  expect(last().searchParams.get('category')).toBe('arte-digital,musica')

  // Every card matches the filters (the detail page shows category + chain).
  const count = await cardNames(page).count()
  expect(count).toBeGreaterThan(0)
  expect(count).toBeLessThan(9 + 1)

  await search(page, mobile, 'zzz-nada')
  await expect(page.getByText('Nenhum NFT encontrado')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page).not.toHaveURL(/categories|chains|q=/)
  await expect(cardNames(page)).toHaveCount(9)
})

test('sort, pagination, filter resets the page, history and refresh restore', async ({ page, mobile }) => {
  await page.goto('/')
  await expect(cardNames(page)).toHaveCount(9)

  // Sort by lowest price.
  if (mobile) {
    const sheet = await openFilters(page, mobile)
    await sheet.getByLabel('Ordenar por').selectOption('price-asc')
    await closeFilters(page, mobile)
  } else {
    await page.getByLabel('Ordenar por:').selectOption('price-asc')
  }
  await expect(page).toHaveURL(/sort=price-asc/)
  await expect.poll(async () => {
    const prices = await cardPrices(page)
    return prices.length === 9 && prices.every((p, i) => i === 0 || prices[i - 1]! <= p)
  }).toBe(true)
  const firstPage = await cardNames(page).allTextContents()

  // Page 2: different items, still sorted.
  await page.getByRole('link', { name: 'Página 2' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect.poll(async () => (await cardNames(page).allTextContents())[0]).not.toBe(firstPage[0])
  const secondPage = await cardNames(page).allTextContents()
  expect(secondPage.some((n) => firstPage.includes(n))).toBe(false)

  // A filter change goes back to page 1.
  const panel = await openFilters(page, mobile)
  await toggle(panel, 'Polygon')
  await closeFilters(page, mobile)
  await expect(page).toHaveURL(/chains=polygon/)
  await expect(page).not.toHaveURL(/page=/)

  // Back: page 2 without the filter, same items as before.
  await page.goBack()
  await expect(page).toHaveURL(/page=2/)
  await expect(page).not.toHaveURL(/chains=/)
  await expect.poll(() => cardNames(page).allTextContents()).toEqual(secondPage)

  // Forward + refresh: the filter state survives.
  await page.goForward()
  await expect(page).toHaveURL(/chains=polygon/)
  await page.reload()
  await expect(page).toHaveURL(/chains=polygon/)
  const after = await openFilters(page, mobile)
  await expect(after.getByLabel('Polygon')).toBeChecked()
})

test.describe('out-of-order answers', () => {
  test.use({ scenario: 'out-of-order' })

  test('an older, slower answer never replaces the newer one', async ({ page, context, mobile }) => {
    // Expected results, from another tab (each tab has its own mock counters).
    const other = await context.newPage()
    await other.goto('/?q=emerald')
    await expect(other.locator('#catalogo h3 a').first()).toBeVisible()
    const emerald = await other.locator('#catalogo h3 a').allTextContents()
    await other.close()

    // In this scenario list calls alternate slow (1st, 3rd…) and fast (2nd, 4th…).
    await page.goto('/') //                1: slow
    await expect(cardNames(page)).toHaveCount(9)
    await search(page, mobile, 'nomad') // 2: fast
    await expect(page).toHaveURL(/q=nomad/)
    await expect(cardNames(page).first()).toBeVisible()
    await search(page, mobile, 'sage') //  3: slow, still in flight…
    await expect(page).toHaveURL(/q=sage/)
    await search(page, mobile, 'emerald') // 4: fast, answers first
    await expect(page).toHaveURL(/q=emerald/)
    await expect(cardNames(page)).toHaveText(emerald)
    await page.waitForTimeout(2_000) // the old "sage" answer (1.6 s) has arrived by now
    await expect(cardNames(page)).toHaveText(emerald)
  })
})
