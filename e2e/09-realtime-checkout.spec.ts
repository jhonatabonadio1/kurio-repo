import { addToCart, checkoutReady, confirmPurchase, expect, login, test } from './fixtures'

// Brief §9.9 and §7 — price/stock change via Socket.IO during the checkout.

test('a price change during checkout updates the summary and needs a new confirmation', async ({ page, mocks, mobile }) => {
  await login(page)
  await addToCart(page, mobile, 'emerald-ape-042') // open edition, 1.19 ETH
  await checkoutReady(page)

  // nft.updated goes out through the mock Socket.IO server to socket.io-client.
  await mocks.emit({ kind: 'nft-price', nftId: 'emerald-ape-042', editionId: 'emerald-ape-042--aberta', price: '2.50' })
  await expect(page.getByText('Preço de Emerald Ape #042 mudou de 1.19 ETH para 2.50 ETH.').first()).toBeAttached()
  await expect(page.getByText(/Os valores mudaram: o total foi de/)).toBeVisible()

  // The stale total cannot be confirmed until the new values are accepted.
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  await page.getByRole('button', { name: 'Aceitar os novos valores' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  await confirmPurchase(page)
  await expect(page).toHaveURL(/\/orders\/ord_/)
  const order = Object.values((await mocks.db()).orders)[0]!
  expect(Number(order.receipt.total)).toBeGreaterThan(2.5)
})

test.describe('scheduled change (price-change scenario)', () => {
  test.use({ scenario: 'price-change' })

  test('the price changes 4 s after the quote; the clock is moved, not waited', async ({ page, mobile }) => {
    await page.clock.install()
    await login(page)
    await addToCart(page, mobile, 'emerald-ape-042')
    await checkoutReady(page)
    await expect(page.getByText(/Os valores mudaram/)).toHaveCount(0)
    await page.clock.runFor(4_500)
    await expect(page.getByText(/Os valores mudaram: o total foi de/)).toBeVisible()
  })
})

test('an edition sold out during checkout blocks the order and points to the cart', async ({ page, mocks, mobile }) => {
  await login(page)
  await addToCart(page, mobile, 'sage-nomad-009', { edition: '1-10', qty: 2 })
  await checkoutReady(page)
  await mocks.emit({ kind: 'nft-stock', nftId: 'sage-nomad-009', editionId: 'sage-nomad-009--1-10', available: 0 })
  await expect(page.getByText(/Disponibilidade de Sage Nomad #009 mudou/).first()).toBeAttached()
  await page.goto('/cart')
  await expect(page.getByText('Esta edição esgotou.').locator('visible=true').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remover do carrinho' }).locator('visible=true').first()).toBeVisible()
})

test.describe('sold-out scenario', () => {
  test.use({ scenario: 'sold-out' })
  test('stock ends between quote and order: no order, the cart keeps the items', async ({ page, mocks, mobile }) => {
    await login(page)
    await addToCart(page, mobile, 'emerald-ape-042')
    await checkoutReady(page)
    await confirmPurchase(page)
    await expect(page.getByText(/Sem estoque suficiente/).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ajustar carrinho' })).toBeVisible()
    expect(Object.keys((await mocks.db()).orders)).toHaveLength(0)
  })
})
