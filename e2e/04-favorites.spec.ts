import { expect, login, test, type Page } from './fixtures'

// Brief §9.4 — favorites, optimistic update, failed mutation and recovery.

const heart = (page: Page, mobile: boolean) =>
  mobile
    ? page.getByRole('button', { name: 'Favoritar Emerald Ape #042' }).locator('visible=true').first()
    : page.getByRole('button', { name: 'Favoritar', exact: true })

test('signed out: favoriting asks to log in and comes back', async ({ page, mobile }) => {
  await page.goto('/nfts/emerald-ape-042')
  await heart(page, mobile).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await login(page, 'alice', { from: '' })
  await expect(page).toHaveURL(/\/nfts\/emerald-ape-042/)
})

test.describe('with latency', () => {
  // A visible delay proves the UI changes before the API answers.
  test.use({ latency: 600 })

  test('optimistic toggle, persisted after refresh and listed', async ({ page, mocks, mobile }) => {
    await login(page)
    const loaded = page.waitForResponse((r) => r.url().endsWith('/api/favorites') && r.request().method() === 'GET')
    await page.goto('/nfts/emerald-ape-042')
    await loaded
    await expect(heart(page, mobile)).toHaveAttribute('aria-pressed', 'false')
    await heart(page, mobile).click()
    // Well under the 600 ms API latency: the heart changed before the answer.
    await expect(heart(page, mobile)).toHaveAttribute('aria-pressed', 'true', { timeout: 300 })
    expect((await mocks.db()).favorites.usr_alice ?? []).not.toContain('emerald-ape-042')
    await expect.poll(async () => (await mocks.db()).favorites.usr_alice).toContain('emerald-ape-042')

    await page.reload()
    await expect(heart(page, mobile)).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/favorites')
    await expect(page.getByRole('list', { name: 'NFTs favoritados' }).getByText('Emerald Ape #042')).toBeVisible()
  })

  test('a click before the list loads still saves the right state', async ({ page, mocks, mobile }) => {
    await login(page)
    await page.goto('/nfts/emerald-ape-042')
    await heart(page, mobile).click() // favorites are still loading (600 ms)
    await expect(heart(page, mobile)).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => (await mocks.db()).favorites.usr_alice).toContain('emerald-ape-042')
  })

  test('repeated clicks end in the same state on screen and on the server', async ({ page, mocks, mobile }) => {
    await login(page)
    const loaded = page.waitForResponse((r) => r.url().endsWith('/api/favorites') && r.request().method() === 'GET')
    await page.goto('/nfts/emerald-ape-042')
    await loaded
    for (let i = 0; i < 3; i++) await heart(page, mobile).click()
    await expect(heart(page, mobile)).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => (await mocks.db()).favorites.usr_alice).toContain('emerald-ape-042')
    await page.waitForTimeout(1500)
    expect((await mocks.db()).favorites.usr_alice).toContain('emerald-ape-042')
    await expect(heart(page, mobile)).toHaveAttribute('aria-pressed', 'true')
  })
})

test('a failed mutation rolls back and the user is told', async ({ page, mocks, mobile }) => {
  await login(page)
  await page.goto('/nfts/emerald-ape-042')
  await mocks.setScenario('favorite-error')
  await heart(page, mobile).click()
  await expect(page.getByText(/Não foi possível (adicionar|favoritar).*Emerald Ape #042/).first()).toBeAttached()
  await expect(heart(page, mobile)).toHaveAttribute('aria-pressed', 'false')

  // Recovery: the same action works once the API is back.
  await mocks.setScenario('default')
  await heart(page, mobile).click()
  await expect.poll(async () => (await mocks.db()).favorites.usr_alice).toContain('emerald-ape-042')
})
