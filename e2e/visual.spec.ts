import { addToCart, checkoutReady, expect, login, test, type Page } from './fixtures'

// Brief §9 — visual regression of home, detail, cart and checkout (versioned
// baselines in e2e/__screenshots__). Fixed clock and zero latency keep data stable.

const FIXED_NOW = new Date('2026-10-20T12:00:00.000Z') // FIXTURE_NOW in the mocks

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  // Lazy images load only near the viewport: load them all now (test-only),
  // then wait until every visible one is decoded.
  await page.evaluate(async () => {
    const images = [...document.images]
    for (const img of images) img.loading = 'eager'
    await Promise.all(images.filter((img) => img.checkVisibility()).map((img) => img.decode().catch(() => undefined)))
  })
  // Toasts come and go; they are not part of the layout.
  await page.addStyleTag({ content: 'ol[aria-hidden].fixed{display:none!important}' })
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_NOW)
})

test('home', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#catalogo h3 a')).toHaveCount(9)
  await settle(page)
  await expect(page).toHaveScreenshot('home.png', { fullPage: true })
})

test('detail', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-042')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('detail.png', { fullPage: true })
})

test('cart', async ({ page, mobile }) => {
  await addToCart(page, mobile, 'emerald-ape-042', { edition: '1-50', qty: 2 })
  await addToCart(page, mobile, 'sage-nomad-009')
  await page.goto('/cart')
  await expect(page.getByRole('list', { name: 'Itens do carrinho' }).getByRole('listitem')).toHaveCount(2)
  await expect(page.getByText(/^Total$/).locator('visible=true').first()).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('cart.png', { fullPage: true })
})

test('checkout', async ({ page, mobile }) => {
  await login(page)
  await addToCart(page, mobile, 'emerald-ape-042')
  await checkoutReady(page)
  await settle(page)
  await expect(page).toHaveScreenshot('checkout.png', { fullPage: true })
})
