import { addToCart, confirmPurchase, expect, login, test } from './fixtures'

// Brief §9.6 — full purchase, from the catalog to the confirmed receipt.

test('catalog → detail → cart → checkout → confirmed receipt', async ({ page, mocks, mobile }) => {
  // The mock confirms the payment 3 s after the order; the test moves the clock.
  await page.clock.install()
  await login(page)

  // Catalog → detail through the card link.
  await page.goto('/?q=emerald')
  await page.getByRole('link', { name: 'Emerald Ape #042', exact: true }).click()
  await expect(page).toHaveURL(/\/nfts\/emerald-ape-042/)
  await addToCart(page, mobile, 'emerald-ape-042', { edition: '1-50', qty: 2 })
  await addToCart(page, mobile, 'sage-nomad-009')

  await page.goto('/cart')
  await page.getByRole('button', { name: 'Conectar e finalizar' }).locator('visible=true').first().click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()

  await confirmPurchase(page)
  await expect(page).toHaveURL(/\/orders\/ord_/)
  await expect(page.getByRole('heading', { name: /Aguardando confirmação/ })).toBeVisible()

  await page.clock.runFor(3_500)
  await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()

  // Receipt: transaction id, items, fee and total from the order snapshot.
  const order = Object.values((await mocks.db()).orders)[0]!
  expect(order.status).toBe('confirmed')
  await expect(page.getByText('ID da transação')).toBeVisible()
  await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()
  await expect(page.getByText('Sage Nomad #009').first()).toBeVisible()
  await expect(page.getByText('Taxa de rede').first()).toBeVisible()
  await expect(page.getByText(`${order.receipt.total} ETH`).first()).toBeVisible()

  // Bought items left the cart.
  await page.goto('/cart')
  await expect(page.getByText(/carrinho está vazio/i).first()).toBeVisible()

  // A later price change does not touch the receipt.
  await mocks.emit({ kind: 'nft-price', nftId: 'emerald-ape-042', editionId: 'emerald-ape-042--1-50', price: '9.99' })
  await page.goto(`/orders/${order.id}`)
  await expect(page.getByText(`${order.receipt.total} ETH`).first()).toBeVisible()
})

test('only the bought quantities leave the cart', async ({ page, mocks, mobile }) => {
  await page.clock.install()
  await login(page)
  await addToCart(page, mobile, 'emerald-ape-042')
  await page.goto('/checkout')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  await confirmPurchase(page)
  await expect(page).toHaveURL(/\/orders\/ord_/)

  // Added while the order is pending: it must stay after the confirmation.
  await addToCart(page, mobile, 'neon-vessel-552')
  await page.clock.runFor(3_500)
  await expect.poll(async () => Object.values((await mocks.db()).orders)[0]?.status).toBe('confirmed')

  await page.goto('/cart')
  const list = page.getByRole('list', { name: 'Itens do carrinho' })
  await expect(list.getByText('Neon Vessel #552').locator('visible=true')).toBeVisible()
  await expect(list.getByText('Emerald Ape #042')).toHaveCount(0)
})
