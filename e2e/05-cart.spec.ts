import { addToCart, expect, login, test, type Page } from './fixtures'

// Brief §9.5 — cart, quantities, removal, coupon, persistence after refresh and login.

const items = (page: Page) => page.getByRole('list', { name: 'Itens do carrinho' })
const summaryValue = (page: Page, label: string) =>
  page.locator('dl').locator('visible=true').first().locator('div', { has: page.locator('dt', { hasText: label }) }).locator('dd').first()

test('quantities, removal and coupon follow the API quote', async ({ page, mobile }) => {
  await addToCart(page, mobile, 'emerald-ape-042', { edition: '1-50', qty: 2 })
  await addToCart(page, mobile, 'sage-nomad-009')
  await page.goto('/cart')
  await expect(items(page).getByRole('listitem')).toHaveCount(2)

  const qty = items(page).getByRole('group', { name: 'Quantidade de Emerald Ape #042' }).locator('visible=true').first()
  await expect(qty).toContainText('2')
  // 2 × 1.78 + 1.69 = 5.25
  await expect(summaryValue(page, 'Subtotal')).toHaveText(/5\.25 ETH/)
  await qty.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(qty).toContainText('3')
  await expect(summaryValue(page, 'Subtotal')).toHaveText(/7\.03 ETH/)

  // Coupon: invalid, expired, then a valid one changes the discount.
  const coupon = page.getByLabel('Código promocional').locator('visible=true').first()
  const apply = page.getByRole('button', { name: 'Aplicar' }).locator('visible=true').first()
  await coupon.fill('NOPE')
  await apply.click()
  await expect(page.getByText('Cupom inválido.').first()).toBeVisible()
  await coupon.fill('OLD20')
  await apply.click()
  await expect(page.getByText('Este cupom expirou.').first()).toBeVisible()
  await coupon.fill('welcome10')
  await apply.click()
  await expect(page.getByText(/Cupom\s*WELCOME10\s*aplicado/).locator('visible=true').first()).toBeVisible()
  await expect(summaryValue(page, 'Desconto')).toHaveText(/0\.703/)

  await items(page).getByRole('button', { name: 'Remover Sage Nomad #009 do carrinho' }).locator('visible=true').first().click()
  await expect(items(page).getByRole('listitem')).toHaveCount(1)
  await expect(summaryValue(page, 'Subtotal')).toHaveText(/5\.34 ETH/)

  // Refresh keeps items, quantity and coupon.
  await page.reload()
  await expect(items(page).getByRole('listitem')).toHaveCount(1)
  await expect(qty).toContainText('3')
  await expect(page.getByText(/Cupom\s*WELCOME10\s*aplicado/).locator('visible=true').first()).toBeVisible()
})

test('the guest cart is kept when the visitor logs in', async ({ page, mobile }) => {
  await addToCart(page, mobile, 'neon-vessel-552')
  await login(page, 'alice')
  await page.goto('/cart')
  await expect(items(page).getByText('Neon Vessel #552').locator('visible=true')).toBeVisible()
  await page.reload()
  await expect(items(page).getByText('Neon Vessel #552').locator('visible=true')).toBeVisible()
})

test('the quantity cannot pass the stock of the edition', async ({ page, mobile }) => {
  await addToCart(page, mobile, 'emerald-ape-042', { edition: '1-10', qty: 5 })
  await page.goto('/cart')
  const qty = items(page).getByRole('group', { name: 'Quantidade de Emerald Ape #042' }).locator('visible=true').first()
  await expect(qty).toContainText('5')
  await expect(qty.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
})
