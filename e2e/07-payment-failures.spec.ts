import { addToCart, checkoutReady, confirmPurchase, expect, login, test } from './fixtures'

// Brief §9.7 — payment refused, repeated click, timeout recovered by idempotency.

test.describe('payment refused', () => {
  test.use({ scenario: 'payment-rejected' })

  test('a refused payment is terminal and keeps the cart', async ({ page, mocks, mobile }) => {
    await page.clock.install()
    await login(page)
    await addToCart(page, mobile, 'emerald-ape-042')
    await checkoutReady(page)
    await confirmPurchase(page)
    await expect(page).toHaveURL(/\/orders\/ord_/)
    await page.clock.runFor(3_500)
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toHaveCount(0)

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await page.goto('/cart')
    await expect(page.getByRole('list', { name: 'Itens do carrinho' }).getByText('Emerald Ape #042').locator('visible=true')).toBeVisible()
    expect(Object.values((await mocks.db()).orders).map((o) => o.status)).toEqual(['rejected'])
  })
})

test('repeated clicks create a single order', async ({ page, mocks, mobile }) => {
  await login(page)
  await addToCart(page, mobile, 'emerald-ape-042')
  await checkoutReady(page)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await page.getByRole('button', { name: 'Aprovar conexão' }).click()
  const pay = page.getByRole('button', { name: 'Confirmar e pagar' })
  await pay.dblclick()
  await pay.click({ timeout: 1_000 }).catch(() => undefined) // the dialog may already be gone
  await expect(page).toHaveURL(/\/orders\/ord_/)
  await page.waitForTimeout(500)
  expect(Object.keys((await mocks.db()).orders)).toHaveLength(1)
})

test.describe('order timeout', () => {
  test.use({ scenario: 'order-timeout' })

  test('the answer is lost: the same key recovers the same order', async ({ page, mocks, mobile }) => {
    test.slow() // the client waits for its 8 s order timeout
    await login(page)
    await addToCart(page, mobile, 'emerald-ape-042')
    await checkoutReady(page)
    await confirmPurchase(page)
    // The order exists on the server, but its answer never arrives…
    await expect.poll(async () => Object.keys((await mocks.db()).orders)).toHaveLength(1)
    const [created] = Object.keys((await mocks.db()).orders)
    // …the client times out, sends the same request again and opens that order.
    await expect(page).toHaveURL(new RegExp(`/orders/${created}$`), { timeout: 20_000 })
    expect(Object.keys((await mocks.db()).orders)).toEqual([created])
  })

  test('a refresh while the answer is lost recovers the same order', async ({ page, mocks, mobile }) => {
    await login(page)
    await addToCart(page, mobile, 'emerald-ape-042')
    await checkoutReady(page)
    await confirmPurchase(page)
    await expect.poll(async () => Object.keys((await mocks.db()).orders)).toHaveLength(1)
    const [created] = Object.keys((await mocks.db()).orders)

    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/orders/${created}$`))
    expect(Object.keys((await mocks.db()).orders)).toEqual([created])
  })
})

test('no connection: the error offers "Tentar de novo" with the same request', async ({ page, mocks, mobile }) => {
  await login(page)
  await addToCart(page, mobile, 'emerald-ape-042')
  await checkoutReady(page)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await page.getByRole('button', { name: 'Aprovar conexão' }).click()
  await expect(page.getByRole('heading', { name: 'Revise o pedido' })).toBeVisible()
  await mocks.setScenario('offline')
  await page.getByRole('button', { name: 'Confirmar e pagar' }).click()
  await expect(page.getByText(/Não recebemos a confirmação do pedido/).first()).toBeVisible()
  expect(Object.keys((await mocks.db()).orders)).toHaveLength(0)

  await mocks.setScenario('default')
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page).toHaveURL(/\/orders\/ord_/)
  expect(Object.keys((await mocks.db()).orders)).toHaveLength(1)
})
