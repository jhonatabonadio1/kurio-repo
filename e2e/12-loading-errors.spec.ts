import { addToCart, expect, test } from './fixtures'

// Brief §9.12 and §8 — shimmer skeletons on slow loads, error feedback, retry.

test.describe('slow network', () => {
  test.use({ scenario: 'slow' })

  test('catalog, detail and cart summary show skeletons with the content size', async ({ page, mobile }) => {
    test.slow()
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number }
      w.__cls = 0
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls += e.value
      }).observe({ type: 'layout-shift', buffered: true })
    })
    await page.goto('/')
    const grid = page.getByLabel('Carregando NFTs')
    await expect(grid).toHaveAttribute('aria-busy', 'true')
    await expect(grid.locator('[data-slot=skeleton]').first()).toBeVisible()
    const skeletonBox = await grid.boundingBox()
    await expect(page.locator('#catalogo h3 a')).toHaveCount(9, { timeout: 10_000 })
    const realBox = await page.locator('#catalogo h3 a').first().locator('xpath=ancestor::div[contains(@class,"grid")][1]').boundingBox()
    // Same grid width: the cards replace the skeletons without moving the page.
    expect(Math.abs((realBox?.width ?? 0) - (skeletonBox?.width ?? 0))).toBeLessThan(2)
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
    expect(cls).toBeLessThan(0.1)

    await page.goto('/nfts/emerald-ape-042')
    await expect(page.getByLabel('Carregando NFT')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible({ timeout: 10_000 })

    await addToCart(page, mobile, 'emerald-ape-042')
    await page.goto('/cart')
    await expect(page.getByLabel('Carregando carrinho')).toBeVisible()
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toBeVisible({ timeout: 10_000 })
  })

  test('skeletons stop the shimmer when reduced motion is preferred', async ({ page }) => {
    // The project runs with reducedMotion: 'reduce'.
    await page.goto('/')
    const skeleton = page.getByLabel('Carregando NFTs').locator('[data-slot=skeleton]').first()
    await expect(skeleton).toBeVisible()
    expect(await skeleton.evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
  })

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' })
    test('skeletons shimmer', async ({ page }) => {
      await page.goto('/')
      const skeleton = page.getByLabel('Carregando NFTs').locator('[data-slot=skeleton]').first()
      await expect(skeleton).toBeVisible()
      expect(await skeleton.evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none')
    })
  })
})

test.describe('server error', () => {
  test.use({ scenario: 'server-error' })
  test('the catalog shows the failure and recovers with "Tentar novamente"', async ({ page, mocks }) => {
    test.slow() // the query retries twice before giving up
    await page.goto('/')
    await expect(page.getByText('Não foi possível carregar o catálogo')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })).toBeVisible()
    await mocks.setScenario('default')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.locator('#catalogo h3 a')).toHaveCount(9)
  })

  test('the detail shows the failure and recovers', async ({ page, mocks }) => {
    test.slow()
    await page.goto('/nfts/emerald-ape-042')
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible({ timeout: 15_000 })
    await mocks.setScenario('default')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  })
})

test.describe('offline', () => {
  test.use({ scenario: 'offline' })
  test('no connection is said plainly', async ({ page, mocks }) => {
    test.slow()
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Sem conexão' })).toBeVisible({ timeout: 15_000 })
    await mocks.setScenario('default')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.locator('#catalogo h3 a')).toHaveCount(9)
  })
})

test.describe('flaky network', () => {
  test.use({ scenario: 'flaky' })
  test('a first failure is retried automatically, without an error screen', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#catalogo h3 a')).toHaveCount(9, { timeout: 10_000 })
    await expect(page.getByText('Não foi possível carregar o catálogo')).toHaveCount(0)
  })
})
