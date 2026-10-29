import { addToCart, checkoutReady, confirmPurchase, expect, login, test } from './fixtures'

// Brief §9.10 and §7 — duplicate and old events, disconnect, pending order resumed.


test('duplicates and old events never regress the price or repeat effects', async ({ page, mocks, mobile }) => {
  await addToCart(page, mobile, 'emerald-ape-042')
  await page.goto('/cart')
  const notice = (p: string) => page.getByText(`Preço de Emerald Ape #042 mudou de ${p}`)

  await mocks.emit({ kind: 'nft-price', nftId: 'emerald-ape-042', editionId: 'emerald-ape-042--aberta', price: '2.00' })
  await expect(notice('1.19 ETH para 2.00 ETH').first()).toBeAttached()
  await mocks.emit({ kind: 'nft-price', nftId: 'emerald-ape-042', editionId: 'emerald-ape-042--aberta', price: '3.00' })
  await expect(notice('2.00 ETH para 3.00 ETH').first()).toBeAttached()
  const items = page.getByRole('list', { name: 'Itens do carrinho' })
  await expect(items.getByText('3.00 ETH').locator('visible=true').first()).toBeVisible()

  // The same event again (duplicate) and the older one (version 1 → 2.00).
  await mocks.emit({ kind: 'replay' })
  await mocks.emit({ kind: 'replay', index: -2 })
  await page.waitForTimeout(500)
  await expect(items.getByText('3.00 ETH').locator('visible=true').first()).toBeVisible()
  // 2.00 only appears in the "updated from 2.00 to 3.00" note, never as the price.
  await expect(items.getByText('2.00 ETH', { exact: true })).toHaveCount(0)
  // Each change was announced once (the toast and its live region copy).
  expect(await notice('2.00 ETH para 3.00 ETH').count()).toBeLessThanOrEqual(2)
})

test('disconnect while the order is pending: reconnect, reconcile and no second purchase', async ({ page, mocks, mobile }) => {
  await page.clock.install()
  await login(page)
  await addToCart(page, mobile, 'emerald-ape-042')
  await checkoutReady(page)
  await confirmPurchase(page)
  await expect(page.getByRole('heading', { name: /Aguardando confirmação/ })).toBeVisible()

  // Record every socket status change the page goes through.
  await page.evaluate(() => {
    const seen: string[] = ((window as unknown as { __rt: string[] }).__rt = [])
    new MutationObserver(() => seen.push(document.documentElement.dataset.realtime ?? '')).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-realtime'],
    })
  })
  await mocks.emit({ kind: 'disconnect' })
  await page.clock.runFor(3_500) // the payment settles while the socket is down
  await page.clock.runFor(5_000) // reconnect backoff / status polling
  await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible({ timeout: 15_000 })
  const seen = await page.evaluate(() => (window as unknown as { __rt: string[] }).__rt)
  expect(seen).toContain('disconnected')

  await page.reload()
  await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
  expect(Object.keys((await mocks.db()).orders)).toHaveLength(1)
})

test('a pending order survives a refresh and is followed to the end', async ({ page, mocks, mobile }) => {
  await page.clock.install()
  await login(page)
  await addToCart(page, mobile, 'emerald-ape-042')
  await checkoutReady(page)
  await confirmPurchase(page)
  await expect(page.getByRole('heading', { name: /Aguardando confirmação/ })).toBeVisible()
  const url = page.url()

  await page.reload()
  await expect(page).toHaveURL(url)
  await expect(page.getByRole('heading', { name: /Aguardando confirmação/ })).toBeVisible()
  // The checkout points to the order in progress instead of buying again.
  await page.goto('/checkout')
  await page.goto(url)
  await page.clock.runFor(3_500)
  await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
  expect(Object.keys((await mocks.db()).orders)).toHaveLength(1)
  // Confirmed is terminal: a late duplicate of an older event changes nothing.
  await mocks.emit({ kind: 'replay', index: 0 })
  await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
})
